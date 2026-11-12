import json
import os
import secrets
import threading
from datetime import date, timedelta
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS

from autenticacion import (
    buscar_usuario,
    cargar_usuarios,
    crear_usuario,
    guardar_usuarios,
    usuario_publico,
    validar_registro,
    verificar_password,
)
from limitador import LimitadorIntentos
from models import (
    ESTADOS_FACTURA,
    Carrito,
    Factura,
    GestorFacturas,
    Inventario,
    Producto,
    estado_inicial,
    normalizar_envio,
)
from ubicaciones import MUNICIPIOS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
INVENTARIO_PATH = os.path.join(DATA_DIR, 'inventario.json')
FACTURAS_PATH = os.path.join(DATA_DIR, 'facturas.json')
CONFIG_PATH = os.path.join(DATA_DIR, 'config.json')
FRONTEND_DIST = os.path.join(BASE_DIR, 'frontend', 'dist')
EXTENSIONES_FOTO = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}


def cargar_secret_key():
    """Usa SECRET_KEY si está definida; si no, guarda una clave local estable."""
    clave = os.environ.get('SECRET_KEY')
    if clave:
        return clave

    ruta = os.path.join(DATA_DIR, 'secret_key')
    try:
        with open(ruta, 'r', encoding='utf-8') as archivo:
            clave = archivo.read().strip()
        if clave:
            return clave
    except FileNotFoundError:
        pass

    os.makedirs(DATA_DIR, exist_ok=True)
    clave = secrets.token_hex(32)
    with open(ruta, 'w', encoding='utf-8') as archivo:
        archivo.write(clave)
    return clave


app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB por foto
app.config['PROPAGATE_EXCEPTIONS'] = False
app.config['SECRET_KEY'] = cargar_secret_key()
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE') == '1'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.json.ensure_ascii = False
CORS(app)

# Inicializar datos
inventario = Inventario()
gestor_facturas = GestorFacturas()
usuarios = cargar_usuarios()
configuracion = {'costo_envio': 0.0}

# Serializa la verificación de stock con la emisión de facturas para evitar
# que dos accesos concurrentes vendan las mismas unidades.
STOCK_LOCK = threading.RLock()


def entero_entorno(nombre, defecto):
    try:
        return max(1, int(os.environ.get(nombre, defecto)))
    except (TypeError, ValueError):
        return defecto


LIMITE_LOGIN_USUARIO = LimitadorIntentos(
    max_intentos=entero_entorno('LOGIN_MAX_INTENTOS', 5),
    ventana=entero_entorno('LOGIN_VENTANA_SEGUNDOS', 900),
    bloqueo=entero_entorno('LOGIN_BLOQUEO_SEGUNDOS', 900),
)
LIMITE_LOGIN_IP = LimitadorIntentos(
    max_intentos=entero_entorno('LOGIN_MAX_INTENTOS_IP', 10),
    ventana=entero_entorno('LOGIN_VENTANA_SEGUNDOS', 900),
    bloqueo=entero_entorno('LOGIN_BLOQUEO_SEGUNDOS', 900),
)


def ip_cliente():
    # No se usa X-Forwarded-For: sin un proxy de confianza sería falsificable.
    return request.remote_addr or 'desconocida'


def clave_login_usuario(ip, nombre_usuario):
    return f'{ip}:{nombre_usuario.casefold()[:100]}'


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

def normalizar_categoria(valor):
    return str(valor or '').strip()[:60]


def parsear_descuento(valor):
    """Valida el descuento recibido y devuelve (descuento, error)."""
    if valor in (None, '', {}):
        return None, None
    if not isinstance(valor, dict):
        return None, 'El descuento debe incluir un porcentaje y un periodo.'

    try:
        porcentaje = float(valor.get('porcentaje'))
    except (TypeError, ValueError):
        return None, 'El porcentaje de descuento debe ser un número.'
    if not 0 < porcentaje < 100:
        return None, 'El porcentaje de descuento debe estar entre 0 y 100.'

    fechas = []
    for campo, etiqueta in (('desde', 'inicio'), ('hasta', 'fin')):
        try:
            fechas.append(date.fromisoformat(str(valor.get(campo))[:10]))
        except (TypeError, ValueError):
            return None, f'La fecha de {etiqueta} del descuento no es válida.'
    if fechas[0] > fechas[1]:
        return None, 'La fecha de fin debe ser igual o posterior al inicio.'

    return {
        'porcentaje': round(porcentaje, 2),
        'desde': fechas[0].isoformat(),
        'hasta': fechas[1].isoformat(),
    }, None


def parsear_envio(valor):
    """Valida los datos de entrega y devuelve (envio, error)."""
    if valor in (None, '', {}):
        return normalizar_envio(None), None
    if not isinstance(valor, dict):
        return None, 'Los datos de envío no son válidos.'

    if not valor.get('a_domicilio'):
        return normalizar_envio({'a_domicilio': False}), None

    direccion = str(valor.get('direccion') or '').strip()
    if not direccion:
        return None, 'Escribí la dirección de entrega.'

    return {
        'a_domicilio': True,
        'ubicacion': '',
        'direccion': direccion[:200],
    }, None


def cargar_config():
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as archivo:
            datos = json.load(archivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'costo_envio': 0.0}

    try:
        costo = float(datos.get('costo_envio', 0))
    except (TypeError, ValueError):
        costo = 0
    return {'costo_envio': round(max(0.0, costo), 2)}


def guardar_config(config):
    os.makedirs(DATA_DIR, exist_ok=True)
    ruta_temporal = f'{CONFIG_PATH}.tmp'
    with open(ruta_temporal, 'w', encoding='utf-8') as archivo:
        json.dump(config, archivo, ensure_ascii=False, indent=2)
    os.replace(ruta_temporal, CONFIG_PATH)


def cargar_datos():
    global configuracion
    os.makedirs(DATA_DIR, exist_ok=True)
    configuracion = cargar_config()

    # Cargar inventario
    try:
        with open(INVENTARIO_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for p in data:
                inventario.addProducto(Producto(**p))
    except FileNotFoundError:
        # Datos de ejemplo
        inventario.addProducto(Producto("Collar de perlas", 10.0, "unidad"))
        inventario.addProducto(Producto("Hilo de nylon", 2.0, "metro"))
        inventario.addProducto(Producto("Cuentas de cristal", 5.0, "unidad"))
        inventario.addProducto(Producto("Alambre de plata", 3.5, "metro"))
        guardar_inventario()

    # Cargar facturas
    try:
        with open(FACTURAS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for fd in data:
                items = [(Producto(**p), c) for p, c in fd["items"]]
                carrito_temp = type("CarritoTemp", (), {"items": items})()
                factura = Factura(
                    fd["numero"],
                    carrito_temp,
                    estado=fd.get("estado"),
                    envio=fd.get("envio"),
                    usuario=fd.get("usuario", ""),
                    codigo=fd.get("codigo"),
                    costo_envio=fd.get("costo_envio", 0),
                    motivo_cancelacion=fd.get("motivo_cancelacion", ""),
                )
                factura.fecha = fd["fecha"]
                factura.subtotal = fd.get("subtotal", factura.subtotal)
                factura.total = fd["total"]
                gestor_facturas.facturas.append(factura)

            renumerar_facturas_por_usuario()

            # Persiste los campos nuevos (estado, código QR) de facturas viejas.
            if data:
                guardar_facturas()
    except FileNotFoundError:
        pass


def renumerar_facturas_por_usuario():
    """Cada usuario tiene su propia secuencia de facturas: 1, 2, 3…"""
    por_usuario = {}
    for factura in gestor_facturas.facturas:
        clave = factura.usuario.casefold()
        por_usuario.setdefault(clave, []).append(factura)

    for facturas_usuario in por_usuario.values():
        facturas_usuario.sort(key=lambda f: (str(f.fecha), f.numero))
        for indice, factura in enumerate(facturas_usuario, start=1):
            factura.numero = indice


def siguiente_numero_factura(usuario):
    numeros = [
        f.numero
        for f in gestor_facturas.facturas
        if f.usuario.casefold() == usuario.casefold()
    ]
    return max(numeros, default=0) + 1

def guardar_inventario():
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(INVENTARIO_PATH, "w", encoding="utf-8") as f:
        json.dump([p.__dict__ for p in inventario.productos], f, default=str, ensure_ascii=False)

def guardar_facturas():
    data = []
    for f in gestor_facturas.facturas:
        items = [(p.__dict__, c) for p, c in f.items]
        factura_data = f.to_dict()
        factura_data["items"] = items
        data.append(factura_data)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(FACTURAS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, default=str, ensure_ascii=False)

# ===== SERVIR LA INTERFAZ =====
@app.route('/')
def index():
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if not os.path.exists(index_path):
        return jsonify({
            'error': 'Frontend no compilado',
            'detalle': 'Ejecutá `npm run build` dentro de frontend/.',
        }), 503
    return send_from_directory(FRONTEND_DIST, 'index.html')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

def es_ruta_api():
    return request.path == '/api' or request.path.startswith('/api/')

RUTAS_PUBLICAS = {
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/ubicaciones',
}

@app.before_request
def exigir_sesion():
    if request.method == 'OPTIONS':
        return None
    ruta = request.path
    if not (es_ruta_api() or ruta.startswith('/uploads/')):
        return None
    if ruta in RUTAS_PUBLICAS:
        return None
    if not session.get('usuario'):
        return jsonify({'error': 'Necesitás iniciar sesión.'}), 401
    return None

@app.errorhandler(413)
def foto_demasiado_grande(_error):
    return jsonify({'error': 'La foto supera el límite de 10 MB.'}), 413

@app.errorhandler(400)
def api_bad_request(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Solicitud inválida.'}), 400

@app.errorhandler(404)
def api_not_found(error):
    if es_ruta_api():
        return jsonify({'error': 'Recurso no encontrado.'}), 404
    # Rutas del cliente (por ejemplo /facturas): devolvemos el index de la SPA.
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if (
        request.method == 'GET'
        and request.accept_mimetypes.accept_html
        and os.path.exists(index_path)
    ):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return error

@app.errorhandler(405)
def api_method_not_allowed(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Método no permitido.'}), 405

@app.errorhandler(500)
def api_internal_error(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Error interno del servidor.'}), 500

# ===== AUTENTICACIÓN =====
@app.route('/api/auth/ubicaciones', methods=['GET'])
def auth_ubicaciones():
    return jsonify(MUNICIPIOS)

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    global usuarios
    datos = request.get_json(silent=True) or {}
    valores, errores = validar_registro(datos, usuarios)
    if errores:
        return jsonify({
            'error': 'Revisá los datos ingresados.',
            'campos': errores,
        }), 400

    usuario = crear_usuario(
        nombres=valores['nombres'],
        apellidos=valores['apellidos'],
        usuario=valores['usuario'],
        residencia=valores['residencia'],
        email=valores['email'],
        password=valores['password'],
    )
    usuarios.append(usuario)
    guardar_usuarios(usuarios)

    session.clear()
    session.permanent = True
    session['usuario'] = usuario['usuario']
    return jsonify(usuario_publico(usuario)), 201

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    datos = request.get_json(silent=True) or {}
    nombre_usuario = str(datos.get('usuario') or '').strip()
    password = datos.get('password')
    ip = ip_cliente()

    espera = espera_login(ip, nombre_usuario)
    if espera:
        respuesta = jsonify({
            'error': (
                'Demasiados intentos fallidos. '
                f'Esperá {espera} segundos antes de volver a intentar.'
            ),
        })
        respuesta.headers['Retry-After'] = str(espera)
        return respuesta, 429

    cuenta = buscar_usuario(usuarios, nombre_usuario)
    if not cuenta or not verificar_password(cuenta, password):
        registrar_fallo_login(ip, nombre_usuario)
        return jsonify({'error': 'Usuario o contraseña incorrectos.'}), 401

    limpiar_intentos_login(ip, nombre_usuario)
    session.clear()
    session.permanent = True
    session['usuario'] = cuenta['usuario']
    return jsonify(usuario_publico(cuenta))

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    nombre_usuario = session.get('usuario')
    if not nombre_usuario:
        return jsonify({'error': 'No hay una sesión activa.'}), 401

    cuenta = buscar_usuario(usuarios, nombre_usuario)
    if not cuenta:
        session.clear()
        return jsonify({'error': 'No hay una sesión activa.'}), 401

    return jsonify(usuario_publico(cuenta))

# ===== ENDPOINTS API =====
@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(configuracion)


@app.route('/api/config', methods=['PUT'])
def update_config():
    global configuracion
    data = request.get_json(silent=True) or {}

    try:
        costo = float(data.get('costo_envio'))
    except (TypeError, ValueError):
        return jsonify({'error': 'El costo de envío debe ser un número.'}), 400
    if costo < 0:
        return jsonify({'error': 'El costo de envío no puede ser negativo.'}), 400
    if costo > 1_000_000:
        return jsonify({'error': 'El costo de envío es demasiado alto.'}), 400

    with STOCK_LOCK:
        configuracion = {'costo_envio': round(costo, 2)}
        guardar_config(configuracion)

    return jsonify(configuracion)


@app.route('/api/uploads', methods=['POST'])
def upload_foto():
    archivo = request.files.get('foto')
    if not archivo or not archivo.filename:
        return jsonify({'error': 'No se recibió ninguna foto.'}), 400

    extension = os.path.splitext(archivo.filename)[1].lower()
    if extension not in EXTENSIONES_FOTO:
        return jsonify({'error': 'Formato no admitido. Usá JPG, PNG, WEBP, GIF o AVIF.'}), 400

    if not (archivo.mimetype or '').startswith('image/'):
        return jsonify({'error': 'El archivo no parece ser una imagen.'}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    nombre_archivo = f'{uuid4().hex}{extension}'
    archivo.save(os.path.join(UPLOAD_DIR, nombre_archivo))
    return jsonify({'url': f'/uploads/{nombre_archivo}'})

@app.route('/api/products', methods=['GET'])
def get_products():
    with STOCK_LOCK:
        return jsonify([p.__dict__ for p in inventario.productos])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json(silent=True) or {}
    nombre = str(data.get('nombre') or '').strip()
    if not nombre:
        return jsonify({'error': 'El nombre no puede estar vacío.'}), 400
    if inventario.searchProducto(nombre):
        return jsonify({'error': 'Ya existe un producto con ese nombre.'}), 409

    try:
        precio = float(data.get('precio'))
    except (TypeError, ValueError):
        return jsonify({'error': 'El precio debe ser un número.'}), 400
    if precio <= 0:
        return jsonify({'error': 'El precio debe ser mayor a cero.'}), 400

    try:
        stock = int(data.get('stock', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'El stock debe ser un número entero.'}), 400
    if stock < 0:
        return jsonify({'error': 'El stock no puede ser negativo.'}), 400

    fotos = data.get('fotos')
    if not isinstance(fotos, list):
        fotos = [data['foto']] if data.get('foto') else []

    descuento, error_descuento = parsear_descuento(data.get('descuento'))
    if error_descuento:
        return jsonify({'error': error_descuento}), 400

    producto = Producto(
        nombre=nombre,
        precio=precio,
        unidad_medida=str(data.get('unidad_medida') or 'unidad').strip() or 'unidad',
        descripcion=str(data.get('descripcion') or '').strip(),
        fotos=[url for url in fotos if isinstance(url, str) and url],
        stock=stock,
        categoria=normalizar_categoria(data.get('categoria')),
        descuento=descuento,
    )
    with STOCK_LOCK:
        inventario.addProducto(producto)
        guardar_inventario()
    return jsonify(producto.__dict__)

@app.route('/api/products/<nombre>', methods=['PUT'])
def update_product(nombre):
    data = request.get_json(silent=True) or {}
    producto = inventario.searchProducto(nombre)
    if not producto:
        return jsonify({'error': 'Producto no encontrado.'}), 404

    nuevo_nombre = str(data.get('nombre', producto.nombre)).strip()
    if not nuevo_nombre:
        return jsonify({'error': 'El nombre no puede estar vacío.'}), 400

    duplicado = inventario.searchProducto(nuevo_nombre)
    if duplicado and duplicado is not producto:
        return jsonify({'error': 'Ya existe un producto con ese nombre.'}), 409

    try:
        precio = float(data.get('precio', producto.precio))
    except (TypeError, ValueError):
        return jsonify({'error': 'El precio debe ser un número.'}), 400
    if precio <= 0:
        return jsonify({'error': 'El precio debe ser mayor a cero.'}), 400

    stock_nuevo = None
    if 'stock' in data:
        try:
            stock_nuevo = int(data.get('stock'))
        except (TypeError, ValueError):
            return jsonify({'error': 'El stock debe ser un número entero.'}), 400
        if stock_nuevo < 0:
            return jsonify({'error': 'El stock no puede ser negativo.'}), 400

    descuento_nuevo = None
    if 'descuento' in data:
        descuento_nuevo, error_descuento = parsear_descuento(data.get('descuento'))
        if error_descuento:
            return jsonify({'error': error_descuento}), 400

    fotos = data.get('fotos')

    with STOCK_LOCK:
        producto.nombre = nuevo_nombre
        producto.precio = precio
        if stock_nuevo is not None:
            producto.stock = stock_nuevo
        if 'unidad_medida' in data:
            producto.unidad_medida = str(data.get('unidad_medida') or '').strip() or 'unidad'
        if 'descripcion' in data:
            producto.descripcion = str(data.get('descripcion') or '').strip()
        if 'categoria' in data:
            producto.categoria = normalizar_categoria(data.get('categoria'))
        if 'descuento' in data:
            producto.descuento = descuento_nuevo
        if isinstance(fotos, list):
            producto.fotos = [url for url in fotos if isinstance(url, str) and url]
        elif data.get('foto'):
            producto.fotos = [data['foto']]

        guardar_inventario()

    return jsonify(producto.__dict__)

@app.route('/api/products/<nombre>', methods=['DELETE'])
def delete_product(nombre):
    with STOCK_LOCK:
        producto = inventario.searchProducto(nombre)
        if not producto:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        inventario.removeProducto(producto)
        guardar_inventario()
    return jsonify({'success': True})

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    usuario = str(session.get('usuario') or '')
    return jsonify([
        f.to_dict()
        for f in gestor_facturas.facturas
        if f.usuario.casefold() == usuario.casefold()
    ])

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    data = request.get_json(silent=True) or {}
    items = data.get('items')
    if not isinstance(items, list) or not items:
        return jsonify({'error': 'La factura no tiene artículos.'}), 400

    envio, error_envio = parsear_envio(data.get('envio'))
    if error_envio:
        return jsonify({'error': error_envio}), 400

    usuario = str(session.get('usuario') or '')

    with STOCK_LOCK:
        pedidos = {}
        for item in items:
            if not isinstance(item, dict):
                return jsonify({'error': 'Hay un artículo inválido en la factura.'}), 400

            producto_data = item.get('producto')
            nombre = producto_data.get('nombre') if isinstance(producto_data, dict) else None
            cantidad = item.get('cantidad')

            if not isinstance(nombre, str) or not nombre.strip():
                return jsonify({'error': 'Hay un artículo inválido en la factura.'}), 400
            if isinstance(cantidad, bool) or not isinstance(cantidad, int) or cantidad <= 0:
                return jsonify({'error': 'Las cantidades deben ser números enteros positivos.'}), 400

            producto = inventario.searchProducto(nombre)
            if not producto:
                return jsonify({'error': f'El producto "{nombre}" ya no está en el inventario.'}), 400

            pedidos[producto.nombre] = pedidos.get(producto.nombre, 0) + cantidad

        carrito_temp = Carrito()
        for nombre, cantidad in pedidos.items():
            producto = inventario.searchProducto(nombre)
            # Se vuelve a comprobar dentro del bloqueo: otra venta pudo haber
            # descontado el stock entre la validación previa y este momento.
            if cantidad > producto.stock:
                return jsonify({
                    'error': (
                        f'No hay stock suficiente de "{producto.nombre}". '
                        f'Disponible: {producto.stock}.'
                    )
                }), 409
            carrito_temp.addChart(producto, cantidad)

        factura = Factura(
            siguiente_numero_factura(usuario),
            carrito_temp,
            estado=estado_inicial(envio),
            envio=envio,
            usuario=usuario,
            costo_envio=configuracion.get('costo_envio', 0),
        )
        gestor_facturas.facturas.append(factura)

        for producto, cantidad in carrito_temp.items:
            producto.stock -= cantidad

        guardar_inventario()
        guardar_facturas()

    return jsonify(factura.to_dict())

@app.route('/api/invoices/<int:numero>', methods=['PATCH'])
def update_invoice(numero):
    data = request.get_json(silent=True) or {}
    estado = str(data.get('estado') or '').strip()
    if estado not in ESTADOS_FACTURA:
        return jsonify({'error': 'El estado indicado no es válido.'}), 400

    motivo = str(
        data.get('motivo_cancelacion') or data.get('motivo') or ''
    ).strip()

    usuario = str(session.get('usuario') or '')
    with STOCK_LOCK:
        factura = gestor_facturas.searchFactura(numero, usuario)
        if not factura:
            return jsonify({'error': 'Factura no encontrada.'}), 404
        factura.cambiar_estado(estado, motivo)
        guardar_facturas()

    return jsonify(factura.to_dict())

if __name__ == '__main__':
    cargar_datos()
    app.run(debug=True, port=5000)
