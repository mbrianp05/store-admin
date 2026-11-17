import os
import secrets
from datetime import date, timedelta
from functools import wraps
from uuid import uuid4

from flask import Flask, g, jsonify, request, send_from_directory, session
from flask_cors import CORS

from autenticacion import (
    ROL_ADMIN,
    ROLES,
    usuario_publico,
    validar_cambio_password,
    validar_perfil,
    validar_registro,
    verificar_password,
)
from database import ejecutar, inicializar_base
from limitador import LimitadorIntentos
from models import ESTADOS_FACTURA, normalizar_envio
import servicios
from servicios import ErrorServicio

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
EXTENSIONES_FOTO = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def cargar_secret_key():
    """Usa SECRET_KEY si está definida; si no, guarda una clave local estable."""
    clave = os.environ.get("SECRET_KEY")
    if clave:
        return clave

    ruta = os.path.join(DATA_DIR, "secret_key")
    try:
        with open(ruta, "r", encoding="utf-8") as archivo:
            clave = archivo.read().strip()
        if clave:
            return clave
    except FileNotFoundError:
        pass

    os.makedirs(DATA_DIR, exist_ok=True)
    clave = secrets.token_hex(32)
    with open(ruta, "w", encoding="utf-8") as archivo:
        archivo.write(clave)
    return clave


app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB por foto
app.config["PROPAGATE_EXCEPTIONS"] = False
app.config["SECRET_KEY"] = cargar_secret_key()
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE") == "1"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)
app.json.ensure_ascii = False
CORS(app)


def iniciar_base_de_datos():
    """Crea las tablas y los datos mínimos antes de atender peticiones."""
    try:
        ejecutar(inicializar_base())
    except Exception as error:
        raise RuntimeError(
            "No se pudo inicializar PostgreSQL. Revisa DATABASE_URL y que el "
            f"servidor esté disponible. Detalle: {error}"
        ) from error


iniciar_base_de_datos()


def entero_entorno(nombre, defecto):
    try:
        return max(1, int(os.environ.get(nombre, defecto)))
    except (TypeError, ValueError):
        return defecto


LIMITE_LOGIN_USUARIO = LimitadorIntentos(
    max_intentos=entero_entorno("LOGIN_MAX_INTENTOS", 5),
    ventana=entero_entorno("LOGIN_VENTANA_SEGUNDOS", 900),
    bloqueo=entero_entorno("LOGIN_BLOQUEO_SEGUNDOS", 900),
)
LIMITE_LOGIN_IP = LimitadorIntentos(
    max_intentos=entero_entorno("LOGIN_MAX_INTENTOS_IP", 10),
    ventana=entero_entorno("LOGIN_VENTANA_SEGUNDOS", 900),
    bloqueo=entero_entorno("LOGIN_BLOQUEO_SEGUNDOS", 900),
)


def ip_cliente():
    # No se usa X-Forwarded-For: sin un proxy de confianza sería falsificable.
    return request.remote_addr or "desconocida"


def clave_login_usuario(ip, nombre_usuario):
    return f"{ip}:{nombre_usuario.casefold()[:100]}"


def espera_login(ip, nombre_usuario):
    espera_ip = LIMITE_LOGIN_IP.espera(ip)
    espera_usuario = (
        LIMITE_LOGIN_USUARIO.espera(clave_login_usuario(ip, nombre_usuario))
        if nombre_usuario
        else 0
    )
    return max(espera_ip, espera_usuario)


def registrar_fallo_login(ip, nombre_usuario):
    LIMITE_LOGIN_IP.registrar_fallo(ip)
    if nombre_usuario:
        LIMITE_LOGIN_USUARIO.registrar_fallo(clave_login_usuario(ip, nombre_usuario))


def limpiar_intentos_login(ip, nombre_usuario):
    LIMITE_LOGIN_IP.limpiar(ip)
    if nombre_usuario:
        LIMITE_LOGIN_USUARIO.limpiar(clave_login_usuario(ip, nombre_usuario))


# Empleados y administradores comparten la gestión operativa del negocio.
ROLES_GESTION = ("empleado", ROL_ADMIN)


def usuario_sesion():
    """Devuelve la cuenta de la sesión actual o None si ya no es válida."""
    if "cuenta" in g:
        return g.cuenta

    nombre_usuario = session.get("usuario")
    if not nombre_usuario:
        g.cuenta = None
        return None

    cuenta = ejecutar(servicios.obtener_usuario(nombre_usuario))
    if not cuenta:
        session.clear()
        g.cuenta = None
        return None

    g.cuenta = cuenta
    return cuenta


def rol_sesion():
    cuenta = usuario_sesion()
    return cuenta.get("rol") if cuenta else None


def requiere_roles(*roles):
    """Restringe un endpoint a los roles indicados."""

    def decorador(funcion):
        @wraps(funcion)
        def envoltura(*args, **kwargs):
            cuenta = usuario_sesion()
            if not cuenta:
                return jsonify({"error": "Necesitas iniciar sesión."}), 401
            if cuenta.get("rol") not in roles:
                return jsonify({
                    "error": "No tienes permisos para realizar esta acción.",
                }), 403
            return funcion(*args, **kwargs)

        return envoltura

    return decorador


def normalizar_categoria(valor):
    return str(valor or "").strip()[:60]


def parsear_descuento(valor):
    """Valida el descuento recibido y devuelve (descuento, error)."""
    if valor in (None, "", {}):
        return None, None
    if not isinstance(valor, dict):
        return None, "El descuento debe incluir un porcentaje y un periodo."

    try:
        porcentaje = float(valor.get("porcentaje"))
    except (TypeError, ValueError):
        return None, "El porcentaje de descuento debe ser un número."
    if not 0 < porcentaje < 100:
        return None, "El porcentaje de descuento debe estar entre 0 y 100."

    fechas = []
    for campo, etiqueta in (("desde", "inicio"), ("hasta", "fin")):
        try:
            fechas.append(date.fromisoformat(str(valor.get(campo))[:10]))
        except (TypeError, ValueError):
            return None, f"La fecha de {etiqueta} del descuento no es válida."
    if fechas[0] > fechas[1]:
        return None, "La fecha de fin debe ser igual o posterior al inicio."

    return {
        "porcentaje": round(porcentaje, 2),
        "desde": fechas[0].isoformat(),
        "hasta": fechas[1].isoformat(),
    }, None


def parsear_envio(valor):
    """Valida los datos de entrega y devuelve (envio, error)."""
    if valor in (None, "", {}):
        return normalizar_envio(None), None
    if not isinstance(valor, dict):
        return None, "Los datos de envío no son válidos."

    if not valor.get("a_domicilio"):
        return normalizar_envio({"a_domicilio": False}), None

    direccion = str(valor.get("direccion") or "").strip()
    if not direccion:
        return None, "Escribe la dirección de entrega."

    return {
        "a_domicilio": True,
        "ubicacion": "",
        "direccion": direccion[:200],
    }, None


# ===== SERVIR LA INTERFAZ =====
@app.route("/")
def index():
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.exists(index_path):
        return jsonify({
            "error": "Frontend no compilado",
            "detalle": "Ejecuta `npm run build` dentro de frontend/.",
        }), 503
    return send_from_directory(FRONTEND_DIST, "index.html")


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


def es_ruta_api():
    return request.path == "/api" or request.path.startswith("/api/")


RUTAS_PUBLICAS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/estado",
}

# El catálogo y las fotos son de consulta pública: un visitante puede ver los
# productos y su ficha, pero todo lo demás sigue exigiendo sesión.
RUTAS_PUBLICAS_LECTURA = {
    "/api/products",
}


@app.before_request
def exigir_sesion():
    if request.method == "OPTIONS":
        return None
    ruta = request.path
    if not (es_ruta_api() or ruta.startswith("/uploads/")):
        return None
    if ruta in RUTAS_PUBLICAS:
        return None
    if request.method in ("GET", "HEAD"):
        if ruta in RUTAS_PUBLICAS_LECTURA or ruta.startswith("/uploads/"):
            return None
    if not session.get("usuario"):
        return jsonify({"error": "Necesitas iniciar sesión."}), 401
    return None


@app.errorhandler(413)
def foto_demasiado_grande(_error):
    return jsonify({"error": "La foto supera el límite de 10 MB."}), 413


@app.errorhandler(400)
def api_bad_request(error):
    if not es_ruta_api():
        return error
    return jsonify({"error": "Solicitud inválida."}), 400


@app.errorhandler(404)
def api_not_found(error):
    if es_ruta_api():
        return jsonify({"error": "Recurso no encontrado."}), 404
    # Rutas del cliente (por ejemplo /facturas): devolvemos el index de la SPA.
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if (
        request.method == "GET"
        and request.accept_mimetypes.accept_html
        and os.path.exists(index_path)
    ):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return error


@app.errorhandler(405)
def api_method_not_allowed(error):
    if not es_ruta_api():
        return error
    return jsonify({"error": "Método no permitido."}), 405


@app.errorhandler(500)
def api_internal_error(error):
    if not es_ruta_api():
        return error
    return jsonify({"error": "Error interno del servidor."}), 500


@app.errorhandler(ErrorServicio)
def api_error_servicio(error):
    return jsonify({"error": error.mensaje}), error.estado


# ===== AUTENTICACIÓN =====
@app.route("/api/auth/estado", methods=["GET"])
def auth_estado():
    """Informa si ya existe alguna cuenta; la primera registrada será admin."""
    total = ejecutar(servicios.contar_usuarios())
    return jsonify({
        "hay_usuarios": total > 0,
        "total_usuarios": total,
        "primer_usuario_admin": total == 0,
    })


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    datos = request.get_json(silent=True) or {}
    valores, errores = validar_registro(
        datos, ejecutar(servicios.nombres_usuarios())
    )
    if errores:
        return jsonify({
            "error": "Revisa los datos ingresados.",
            "campos": errores,
        }), 400

    usuario = ejecutar(servicios.crear_cuenta(valores))

    session.clear()
    session.permanent = True
    session["usuario"] = usuario["usuario"]
    return jsonify(usuario), 201


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    datos = request.get_json(silent=True) or {}
    nombre_usuario = str(datos.get("usuario") or "").strip()
    password = datos.get("password")
    ip = ip_cliente()

    espera = espera_login(ip, nombre_usuario)
    if espera:
        respuesta = jsonify({
            "error": (
                "Demasiados intentos fallidos. "
                f"Espera {espera} segundos antes de volver a intentar."
            ),
        })
        respuesta.headers["Retry-After"] = str(espera)
        return respuesta, 429

    cuenta = ejecutar(servicios.obtener_cuenta(nombre_usuario))
    if not cuenta or not verificar_password(cuenta, password):
        registrar_fallo_login(ip, nombre_usuario)
        return jsonify({"error": "Usuario o contraseña incorrectos."}), 401

    limpiar_intentos_login(ip, nombre_usuario)
    session.clear()
    session.permanent = True
    session["usuario"] = cuenta["usuario"]
    return jsonify(usuario_publico(cuenta))


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "No hay una sesión activa."}), 401
    return jsonify(usuario_publico(cuenta))


@app.route("/api/auth/perfil", methods=["PATCH"])
def auth_update_profile():
    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "No hay una sesión activa."}), 401

    datos = request.get_json(silent=True) or {}
    valores, errores = validar_perfil(
        datos, ejecutar(servicios.nombres_usuarios()), cuenta
    )
    if errores:
        return jsonify({
            "error": "Revisa los datos ingresados.",
            "campos": errores,
        }), 400

    actualizado = ejecutar(servicios.actualizar_perfil(cuenta["id"], valores))
    session["usuario"] = actualizado["usuario"]
    g.cuenta = {**actualizado, "id": cuenta["id"]}
    return jsonify(actualizado)


@app.route("/api/auth/password", methods=["POST"])
def auth_change_password():
    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "No hay una sesión activa."}), 401

    # La cuenta de sesión no incluye el hash; se consulta para verificar la
    # contraseña actual antes de cambiarla.
    cuenta_completa = ejecutar(servicios.obtener_cuenta(cuenta["usuario"]))
    if not cuenta_completa:
        session.clear()
        return jsonify({"error": "No hay una sesión activa."}), 401

    datos = request.get_json(silent=True) or {}
    valores, errores = validar_cambio_password(datos, cuenta_completa)
    if errores:
        return jsonify({
            "error": "Revisa los datos ingresados.",
            "campos": errores,
        }), 400

    ejecutar(
        servicios.guardar_password(cuenta["id"], valores["password_nueva"])
    )
    return jsonify({"success": True})


# ===== ADMINISTRACIÓN =====
@app.route("/api/admin/usuarios", methods=["GET"])
@requiere_roles(ROL_ADMIN)
def admin_listar_usuarios():
    return jsonify(ejecutar(servicios.listar_usuarios_admin()))


@app.route("/api/admin/usuarios/<nombre>/rol", methods=["PATCH"])
@requiere_roles(ROL_ADMIN)
def admin_cambiar_rol(nombre):
    datos = request.get_json(silent=True) or {}
    rol = str(datos.get("rol") or "").strip()
    if rol not in ROLES:
        return jsonify({"error": "El rol indicado no es válido."}), 400

    return jsonify(ejecutar(servicios.cambiar_rol(nombre, rol)))


@app.route("/api/contabilidad", methods=["GET"])
@requiere_roles(ROL_ADMIN)
def get_contabilidad():
    return jsonify(ejecutar(servicios.datos_contabilidad()))


# ===== ENDPOINTS API =====
@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(ejecutar(servicios.obtener_config()))


@app.route("/api/config", methods=["PUT"])
@requiere_roles(ROL_ADMIN)
def update_config():
    data = request.get_json(silent=True) or {}

    try:
        costo = float(data.get("costo_envio"))
    except (TypeError, ValueError):
        return jsonify({"error": "El costo de envío debe ser un número."}), 400
    if costo < 0:
        return jsonify({"error": "El costo de envío no puede ser negativo."}), 400
    if costo > 1_000_000:
        return jsonify({"error": "El costo de envío es demasiado alto."}), 400

    return jsonify(ejecutar(servicios.actualizar_config(costo)))


@app.route("/api/uploads", methods=["POST"])
@requiere_roles(*ROLES_GESTION)
def upload_foto():
    archivo = request.files.get("foto")
    if not archivo or not archivo.filename:
        return jsonify({"error": "No se recibió ninguna foto."}), 400

    extension = os.path.splitext(archivo.filename)[1].lower()
    if extension not in EXTENSIONES_FOTO:
        return jsonify({
            "error": "Formato no admitido. Usa JPG, PNG, WEBP, GIF o AVIF."
        }), 400

    if not (archivo.mimetype or "").startswith("image/"):
        return jsonify({"error": "El archivo no parece ser una imagen."}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    nombre_archivo = f"{uuid4().hex}{extension}"
    archivo.save(os.path.join(UPLOAD_DIR, nombre_archivo))
    return jsonify({"url": f"/uploads/{nombre_archivo}"})


@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(ejecutar(servicios.listar_productos()))


@app.route("/api/products", methods=["POST"])
@requiere_roles(*ROLES_GESTION)
def add_product():
    data = request.get_json(silent=True) or {}
    nombre = str(data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "El nombre no puede estar vacío."}), 400

    try:
        precio = float(data.get("precio"))
    except (TypeError, ValueError):
        return jsonify({"error": "El precio debe ser un número."}), 400
    if precio <= 0:
        return jsonify({"error": "El precio debe ser mayor a cero."}), 400

    try:
        stock = int(data.get("stock", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "El stock debe ser un número entero."}), 400
    if stock < 0:
        return jsonify({"error": "El stock no puede ser negativo."}), 400

    fotos = data.get("fotos")
    if not isinstance(fotos, list):
        fotos = [data["foto"]] if data.get("foto") else []

    descuento, error_descuento = parsear_descuento(data.get("descuento"))
    if error_descuento:
        return jsonify({"error": error_descuento}), 400

    producto = ejecutar(servicios.crear_producto({
        "nombre": nombre,
        "precio": precio,
        "unidad_medida": (
            str(data.get("unidad_medida") or "unidad").strip() or "unidad"
        ),
        "descripcion": str(data.get("descripcion") or "").strip(),
        "fotos": [url for url in fotos if isinstance(url, str) and url],
        "stock": stock,
        "categoria": normalizar_categoria(data.get("categoria")),
        "descuento": descuento,
        "reposicion_pendiente": bool(data.get("reposicion_pendiente")),
    }))
    return jsonify(producto)


@app.route("/api/products/<nombre>", methods=["PUT"])
@requiere_roles(*ROLES_GESTION)
def update_product(nombre):
    data = request.get_json(silent=True) or {}
    cambios = {}

    if "nombre" in data:
        nuevo_nombre = str(data.get("nombre") or "").strip()
        if not nuevo_nombre:
            return jsonify({"error": "El nombre no puede estar vacío."}), 400
        cambios["nombre"] = nuevo_nombre

    if "precio" in data:
        try:
            precio = float(data.get("precio"))
        except (TypeError, ValueError):
            return jsonify({"error": "El precio debe ser un número."}), 400
        if precio <= 0:
            return jsonify({"error": "El precio debe ser mayor a cero."}), 400
        cambios["precio"] = precio

    if "stock" in data:
        try:
            stock_nuevo = int(data.get("stock"))
        except (TypeError, ValueError):
            return jsonify({
                "error": "El stock debe ser un número entero."
            }), 400
        if stock_nuevo < 0:
            return jsonify({"error": "El stock no puede ser negativo."}), 400
        cambios["stock"] = stock_nuevo

    if "descuento" in data:
        descuento_nuevo, error_descuento = parsear_descuento(
            data.get("descuento")
        )
        if error_descuento:
            return jsonify({"error": error_descuento}), 400
        cambios["descuento"] = descuento_nuevo

    fotos = data.get("fotos")
    if isinstance(fotos, list):
        cambios["fotos"] = [
            url for url in fotos if isinstance(url, str) and url
        ]
    elif data.get("foto"):
        cambios["fotos"] = [data["foto"]]

    if "unidad_medida" in data:
        cambios["unidad_medida"] = (
            str(data.get("unidad_medida") or "").strip() or "unidad"
        )
    if "descripcion" in data:
        cambios["descripcion"] = str(data.get("descripcion") or "").strip()
    if "categoria" in data:
        cambios["categoria"] = normalizar_categoria(data.get("categoria"))
    if "reposicion_pendiente" in data:
        cambios["reposicion_pendiente"] = bool(
            data.get("reposicion_pendiente")
        )

    return jsonify(ejecutar(servicios.actualizar_producto(nombre, cambios)))


@app.route("/api/products/<nombre>", methods=["DELETE"])
@requiere_roles(*ROLES_GESTION)
def delete_product(nombre):
    ejecutar(servicios.eliminar_producto(nombre))
    return jsonify({"success": True})


@app.route("/api/invoices", methods=["GET"])
def get_invoices():
    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "Necesitas iniciar sesión."}), 401

    # Clientes ven solo sus facturas; empleados y administradores, todas.
    todas = cuenta["rol"] in ROLES_GESTION
    return jsonify(ejecutar(
        servicios.listar_facturas(usuario_id=cuenta["id"], todas=todas)
    ))


@app.route("/api/invoices", methods=["POST"])
def create_invoice():
    data = request.get_json(silent=True) or {}
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"error": "La factura no tiene artículos."}), 400

    envio, error_envio = parsear_envio(data.get("envio"))
    if error_envio:
        return jsonify({"error": error_envio}), 400

    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "Necesitas iniciar sesión."}), 401

    pedidos = []
    for item in items:
        if not isinstance(item, dict):
            return jsonify({
                "error": "Hay un artículo inválido en la factura."
            }), 400

        producto_data = item.get("producto")
        nombre = (
            producto_data.get("nombre")
            if isinstance(producto_data, dict)
            else None
        )
        cantidad = item.get("cantidad")

        if not isinstance(nombre, str) or not nombre.strip():
            return jsonify({
                "error": "Hay un artículo inválido en la factura."
            }), 400
        if isinstance(cantidad, bool) or not isinstance(cantidad, int) or cantidad <= 0:
            return jsonify({
                "error": "Las cantidades deben ser números enteros positivos."
            }), 400

        pedidos.append({"nombre": nombre, "cantidad": cantidad})

    factura = ejecutar(servicios.crear_factura(cuenta["id"], pedidos, envio))
    return jsonify(factura)


@app.route("/api/invoices/<int:numero>", methods=["PATCH"])
@requiere_roles(*ROLES_GESTION)
def update_invoice(numero):
    data = request.get_json(silent=True) or {}
    estado = str(data.get("estado") or "").strip()
    if estado not in ESTADOS_FACTURA:
        return jsonify({"error": "El estado indicado no es válido."}), 400

    motivo = str(
        data.get("motivo_cancelacion") or data.get("motivo") or ""
    ).strip()
    usuario = str(data.get("usuario") or "").strip()

    return jsonify(ejecutar(
        servicios.cambiar_estado_factura(numero, estado, motivo, usuario)
    ))


@app.route("/api/envios", methods=["GET"])
@requiere_roles(*ROLES_GESTION)
def get_envios():
    return jsonify(ejecutar(servicios.listar_envios()))


@app.route("/api/envios", methods=["POST"])
@requiere_roles(*ROLES_GESTION)
def create_envio():
    data = request.get_json(silent=True) or {}
    seleccion = data.get("facturas")
    if not isinstance(seleccion, list) or not seleccion:
        return jsonify({
            "error": "Selecciona al menos una factura para el envío."
        }), 400

    codigos = []
    for entrada in seleccion:
        codigo = (
            str(entrada.get("codigo") or "").strip()
            if isinstance(entrada, dict)
            else str(entrada or "").strip()
        )
        codigos.append(codigo)

    cuenta = usuario_sesion()
    if not cuenta:
        return jsonify({"error": "Necesitas iniciar sesión."}), 401

    envio = ejecutar(servicios.crear_envio(
        cuenta["id"], codigos, data.get("notas") or ""
    ))
    return jsonify(envio), 201


@app.route("/api/envios/<envio_id>", methods=["PATCH"])
@requiere_roles(*ROLES_GESTION)
def update_envio(envio_id):
    data = request.get_json(silent=True) or {}
    estado = str(data.get("estado") or "").strip()
    if estado not in ("entregado", "cancelado"):
        return jsonify({"error": "El estado del envío no es válido."}), 400

    return jsonify(ejecutar(servicios.actualizar_envio(envio_id, estado)))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
