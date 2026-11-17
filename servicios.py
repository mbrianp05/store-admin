"""Servicios asíncronos de negocio sobre PostgreSQL.

Cada función abre su propia sesión y devuelve datos listos para serializar.
Las vistas de Flask no manejan ORM ni sesiones: solo llaman a estos servicios
mediante ``database.ejecutar()``.
"""

import secrets
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy import delete, func, select

from autenticacion import (
    ROL_ADMIN,
    ROL_POR_DEFECTO,
    actualizar_password,
    crear_usuario,
    normalizar_rol,
    usuario_publico,
)
from database import sesion_bd
from models import (
    Categoria,
    Configuracion,
    Descuento,
    ESTADOS_FACTURA,
    Envio,
    EnvioFactura,
    Factura,
    FacturaItem,
    Producto,
    ProductoFoto,
    Usuario,
    estado_inicial,
    normalizar_envio,
)

CENTAVOS = Decimal("0.01")

MESES_CORTOS = (
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
)


class ErrorServicio(Exception):
    """Error de negocio que la API convierte en una respuesta JSON."""

    def __init__(self, mensaje, estado=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.estado = estado


def _dinero(valor):
    return Decimal(str(valor or 0)).quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def _producto_desde_filas(producto):
    return producto.to_dict()


# ===== USUARIOS =====
async def contar_usuarios():
    async with sesion_bd() as sesion:
        return int(await sesion.scalar(select(func.count()).select_from(Usuario)))


async def nombres_usuarios():
    async with sesion_bd() as sesion:
        return list(await sesion.scalars(select(Usuario.usuario)))


async def obtener_cuenta(nombre):
    """Cuenta completa, incluido el hash, para validar credenciales."""
    buscado = str(nombre or "").strip().casefold()
    if not buscado:
        return None

    async with sesion_bd() as sesion:
        usuario = await sesion.scalar(
            select(Usuario).where(func.lower(Usuario.usuario) == buscado)
        )
        if not usuario:
            return None
        return {
            "id": usuario.id,
            "usuario": usuario.usuario,
            "nombres": usuario.nombres,
            "apellidos": usuario.apellidos,
            "email": usuario.email,
            "creado": usuario.creado,
            "rol": normalizar_rol(usuario.rol),
            "password_hash": usuario.password_hash,
        }


async def obtener_usuario(nombre):
    """Datos de la cuenta sin credenciales, para la sesión y la API."""
    cuenta = await obtener_cuenta(nombre)
    if cuenta is None:
        return None
    cuenta.pop("password_hash", None)
    return cuenta


async def crear_cuenta(valores):
    async with sesion_bd() as sesion:
        total = int(
            await sesion.scalar(select(func.count()).select_from(Usuario))
        )
        cuenta = crear_usuario(
            nombres=valores["nombres"],
            apellidos=valores["apellidos"],
            usuario=valores["usuario"],
            email=valores["email"],
            password=valores["password"],
            rol=ROL_ADMIN if total == 0 else ROL_POR_DEFECTO,
        )
        sesion.add(cuenta)
        await sesion.flush()
        return usuario_publico(cuenta)


async def listar_usuarios_admin():
    async with sesion_bd() as sesion:
        filas = await sesion.execute(
            select(Usuario, func.count(Factura.id))
            .outerjoin(Factura, Factura.usuario_id == Usuario.id)
            .group_by(Usuario.id)
            .order_by(Usuario.id)
        )
        resultado = []
        for indice, (usuario, facturas) in enumerate(filas.all()):
            resultado.append({
                **usuario_publico(usuario),
                "fundador": indice == 0,
                "facturas": int(facturas),
            })
        return resultado


async def actualizar_perfil(usuario_id, valores):
    async with sesion_bd() as sesion:
        usuario = await sesion.get(Usuario, usuario_id)
        if not usuario:
            raise ErrorServicio("No hay una sesión activa.", 401)

        duplicado = await sesion.scalar(
            select(Usuario.id).where(
                func.lower(Usuario.usuario) == valores["usuario"].casefold(),
                Usuario.id != usuario_id,
            )
        )
        if duplicado:
            raise ErrorServicio("Ese usuario ya está en uso.", 400)

        usuario.usuario = valores["usuario"]
        usuario.email = valores["email"]
        await sesion.flush()
        return usuario_publico(usuario)


async def guardar_password(usuario_id, password):
    async with sesion_bd() as sesion:
        usuario = await sesion.get(Usuario, usuario_id)
        if not usuario:
            raise ErrorServicio("No hay una sesión activa.", 401)
        actualizar_password(usuario, password)
        await sesion.flush()


async def cambiar_rol(nombre, rol):
    async with sesion_bd() as sesion:
        usuario = await sesion.scalar(
            select(Usuario)
            .where(func.lower(Usuario.usuario) == str(nombre).casefold())
            .with_for_update(of=Usuario)
        )
        if not usuario:
            raise ErrorServicio("Usuario no encontrado.", 404)

        rol_actual = normalizar_rol(usuario.rol)
        if rol == rol_actual:
            return usuario_publico(usuario)

        if rol_actual == ROL_ADMIN and rol != ROL_ADMIN:
            admins = int(
                await sesion.scalar(
                    select(func.count())
                    .select_from(Usuario)
                    .where(Usuario.rol == ROL_ADMIN)
                )
            )
            if admins <= 1:
                raise ErrorServicio(
                    "Debe quedar al menos un administrador en Venture.", 409
                )

        usuario.rol = rol
        await sesion.flush()
        return usuario_publico(usuario)


# ===== CONFIGURACIÓN =====
async def obtener_config():
    async with sesion_bd() as sesion:
        configuracion = await sesion.get(Configuracion, 1)
        return {
            "costo_envio": (
                float(configuracion.costo_envio) if configuracion else 0.0
            )
        }


async def actualizar_config(costo):
    async with sesion_bd() as sesion:
        configuracion = await sesion.get(Configuracion, 1)
        if not configuracion:
            configuracion = Configuracion(id=1)
            sesion.add(configuracion)
        configuracion.costo_envio = _dinero(costo)
        await sesion.flush()
        return {"costo_envio": float(configuracion.costo_envio)}


# ===== PRODUCTOS =====
async def listar_productos():
    async with sesion_bd() as sesion:
        productos = await sesion.scalars(
            select(Producto).order_by(Producto.id)
        )
        return [_producto_desde_filas(producto) for producto in productos]


async def _obtener_categoria(sesion, nombre):
    nombre = str(nombre or "").strip()[:60]
    if not nombre:
        return None

    categoria = await sesion.scalar(
        select(Categoria).where(func.lower(Categoria.nombre) == nombre.casefold())
    )
    if categoria:
        return categoria

    categoria = Categoria(nombre=nombre)
    sesion.add(categoria)
    await sesion.flush()
    return categoria


async def crear_producto(datos):
    nombre = str(datos["nombre"]).strip()
    async with sesion_bd() as sesion:
        duplicado = await sesion.scalar(
            select(Producto.id).where(
                func.lower(Producto.nombre) == nombre.casefold()
            )
        )
        if duplicado:
            raise ErrorServicio("Ya existe un producto con ese nombre.", 409)

        stock = int(datos.get("stock") or 0)
        producto = Producto(
            nombre=nombre,
            precio=_dinero(datos["precio"]),
            unidad_medida=str(datos.get("unidad_medida") or "unidad").strip()
            or "unidad",
            descripcion=str(datos.get("descripcion") or "").strip(),
            stock=stock,
            reposicion_pendiente=bool(datos.get("reposicion_pendiente"))
            and stock <= 0,
        )
        producto.categoria = await _obtener_categoria(
            sesion, datos.get("categoria")
        )
        producto.fotos = [
            ProductoFoto(url=url, orden=indice)
            for indice, url in enumerate(datos.get("fotos") or [])
        ]
        descuento = datos.get("descuento")
        if descuento:
            producto.descuento = Descuento(
                porcentaje=Decimal(str(descuento["porcentaje"])),
                desde=date.fromisoformat(descuento["desde"]),
                hasta=date.fromisoformat(descuento["hasta"]),
            )

        sesion.add(producto)
        await sesion.flush()
        return producto.to_dict()


async def actualizar_producto(nombre_original, cambios):
    async with sesion_bd() as sesion:
        producto = await sesion.scalar(
            select(Producto)
            .where(
                func.lower(Producto.nombre)
                == str(nombre_original).strip().casefold()
            )
            .with_for_update(of=Producto)
        )
        if not producto:
            raise ErrorServicio("Producto no encontrado.", 404)

        nuevo_nombre = str(cambios.get("nombre", producto.nombre)).strip()
        if not nuevo_nombre:
            raise ErrorServicio("El nombre no puede estar vacío.", 400)

        duplicado = await sesion.scalar(
            select(Producto.id).where(
                func.lower(Producto.nombre) == nuevo_nombre.casefold(),
                Producto.id != producto.id,
            )
        )
        if duplicado:
            raise ErrorServicio("Ya existe un producto con ese nombre.", 409)

        producto.nombre = nuevo_nombre
        if "precio" in cambios:
            producto.precio = _dinero(cambios["precio"])
        if "stock" in cambios:
            producto.stock = int(cambios["stock"])
        if "unidad_medida" in cambios:
            producto.unidad_medida = (
                str(cambios["unidad_medida"] or "").strip() or "unidad"
            )
        if "descripcion" in cambios:
            producto.descripcion = str(cambios["descripcion"] or "").strip()
        if "categoria" in cambios:
            producto.categoria = await _obtener_categoria(
                sesion, cambios.get("categoria")
            )
        if "descuento" in cambios:
            descuento = cambios.get("descuento")
            if not descuento:
                producto.descuento = None
            elif producto.descuento:
                producto.descuento.porcentaje = Decimal(
                    str(descuento["porcentaje"])
                )
                producto.descuento.desde = date.fromisoformat(descuento["desde"])
                producto.descuento.hasta = date.fromisoformat(descuento["hasta"])
            else:
                producto.descuento = Descuento(
                    porcentaje=Decimal(str(descuento["porcentaje"])),
                    desde=date.fromisoformat(descuento["desde"]),
                    hasta=date.fromisoformat(descuento["hasta"]),
                )
        if "reposicion_pendiente" in cambios:
            producto.reposicion_pendiente = bool(
                cambios["reposicion_pendiente"]
            )
        # Al volver a tener stock, el aviso de reposición deja de tener sentido.
        if int(producto.stock) > 0:
            producto.reposicion_pendiente = False
        if "fotos" in cambios:
            producto.fotos.clear()
            producto.fotos.extend(
                ProductoFoto(url=url, orden=indice)
                for indice, url in enumerate(cambios.get("fotos") or [])
            )

        await sesion.flush()
        return producto.to_dict()


async def eliminar_producto(nombre):
    async with sesion_bd() as sesion:
        producto = await sesion.scalar(
            select(Producto).where(
                func.lower(Producto.nombre) == str(nombre).strip().casefold()
            )
        )
        if not producto:
            raise ErrorServicio("Producto no encontrado.", 404)

        await sesion.delete(producto)
        await sesion.flush()

        # Limpia las categorías que quedaron sin productos.
        await sesion.execute(
            delete(Categoria).where(
                Categoria.id.not_in(
                    select(Producto.categoria_id).where(
                        Producto.categoria_id.is_not(None)
                    )
                )
            )
        )


# ===== FACTURAS =====
async def listar_facturas(usuario_id=None, todas=False):
    async with sesion_bd() as sesion:
        consulta = select(Factura).order_by(Factura.fecha, Factura.id)
        if not todas:
            if usuario_id is None:
                return []
            consulta = consulta.where(Factura.usuario_id == usuario_id)

        facturas = await sesion.scalars(consulta)
        return [factura.to_dict() for factura in facturas]


async def _codigo_factura(sesion):
    for _ in range(10):
        codigo = secrets.token_hex(4).upper()
        existe = await sesion.scalar(
            select(Factura.id).where(Factura.codigo == codigo)
        )
        if not existe:
            return codigo
    raise ErrorServicio("No se pudo generar el código de la factura.", 500)


async def crear_factura(usuario_id, pedidos, envio):
    """Emite una factura, valida stock y lo descuenta en una transacción."""
    envio_normalizado = normalizar_envio(envio)
    hoy = date.today()

    agrupados = {}
    for pedido in pedidos:
        nombre = str(pedido["nombre"]).strip()
        cantidad = int(pedido["cantidad"])
        clave = nombre.casefold()
        if clave in agrupados:
            agrupados[clave]["cantidad"] += cantidad
        else:
            agrupados[clave] = {"nombre": nombre, "cantidad": cantidad}

    async with sesion_bd() as sesion:
        # El bloqueo de la cuenta serializa la numeración por usuario incluso
        # si la API se ejecuta con varios procesos.
        usuario = await sesion.get(Usuario, usuario_id, with_for_update=True)
        if not usuario:
            raise ErrorServicio("No hay una sesión activa.", 401)

        consulta = (
            select(Producto)
            .where(
                func.lower(Producto.nombre).in_(list(agrupados.keys()))
            )
            .with_for_update(of=Producto)
        )
        productos = {
            producto.nombre.casefold(): producto
            for producto in await sesion.scalars(consulta)
        }

        for clave, pedido in agrupados.items():
            producto = productos.get(clave)
            if not producto:
                raise ErrorServicio(
                    f'El producto "{pedido["nombre"]}" ya no está en el '
                    "inventario.",
                    400,
                )
            if pedido["cantidad"] > int(producto.stock):
                raise ErrorServicio(
                    f'No hay stock suficiente de "{producto.nombre}". '
                    f"Disponible: {producto.stock}.",
                    409,
                )

        configuracion = await sesion.get(Configuracion, 1)
        costo = (
            _dinero(configuracion.costo_envio)
            if envio_normalizado["a_domicilio"] and configuracion
            else Decimal("0.00")
        )

        subtotal = Decimal("0.00")
        items = []
        for clave, pedido in agrupados.items():
            producto = productos[clave]
            precio = _dinero(producto.precio_vigente(hoy))
            subtotal += precio * pedido["cantidad"]
            items.append((producto, precio, pedido["cantidad"]))

        subtotal = _dinero(subtotal)
        total = _dinero(subtotal + costo)

        siguiente = await sesion.scalar(
            select(func.coalesce(func.max(Factura.numero), 0) + 1).where(
                Factura.usuario_id == usuario_id
            )
        )

        factura = Factura(
            codigo=await _codigo_factura(sesion),
            numero=int(siguiente),
            usuario_id=usuario_id,
            usuario=usuario,
            fecha=hoy,
            subtotal=subtotal,
            costo_envio=costo,
            total=total,
            estado=estado_inicial(envio_normalizado),
            a_domicilio=envio_normalizado["a_domicilio"],
            ubicacion=envio_normalizado["ubicacion"],
            direccion=envio_normalizado["direccion"],
        )
        factura.items = [
            FacturaItem(
                producto=producto,
                producto_nombre=producto.nombre,
                unidad_medida=producto.unidad_medida,
                precio_unitario=precio,
                cantidad=cantidad,
            )
            for producto, precio, cantidad in items
        ]

        for producto, _precio, cantidad in items:
            producto.stock = int(producto.stock) - cantidad
            if int(producto.stock) > 0:
                producto.reposicion_pendiente = False

        sesion.add(factura)
        await sesion.flush()
        return factura.to_dict()


async def cambiar_estado_factura(numero, estado, motivo, usuario_nombre=""):
    async with sesion_bd() as sesion:
        consulta = (
            select(Factura)
            .where(Factura.numero == numero)
            .with_for_update(of=Factura)
        )
        if usuario_nombre:
            consulta = consulta.join(
                Usuario, Factura.usuario_id == Usuario.id
            ).where(
                func.lower(Usuario.usuario) == usuario_nombre.casefold()
            )

        coincidencias = list(await sesion.scalars(consulta))
        if not coincidencias:
            raise ErrorServicio("Factura no encontrada.", 404)
        if len(coincidencias) > 1:
            raise ErrorServicio(
                "Hay varias facturas con ese número. Indica el usuario de la "
                "factura.",
                409,
            )

        factura = coincidencias[0]

        if estado == "en_envio" and not factura.a_domicilio:
            raise ErrorServicio(
                "Solo las facturas con envío a domicilio pueden marcarse "
                "como «En envío».",
                400,
            )

        if estado == "cancelada" and factura.estado != "cancelada":
            # Cancelar devuelve al inventario lo que la factura había descontado.
            for item in factura.items:
                if item.producto_id is None:
                    continue
                producto = await sesion.get(
                    Producto, item.producto_id, with_for_update=True
                )
                if producto:
                    producto.stock = int(producto.stock) + int(item.cantidad)
                    if int(producto.stock) > 0:
                        producto.reposicion_pendiente = False
        elif factura.estado == "cancelada" and estado != "cancelada":
            # Reactivar una factura cancelada vuelve a descontar el stock.
            faltantes = []
            preparados = []
            for item in factura.items:
                if item.producto_id is None:
                    faltantes.append(
                        f'"{item.producto_nombre}" ya no está en el inventario'
                    )
                    continue
                producto = await sesion.get(
                    Producto, item.producto_id, with_for_update=True
                )
                if not producto:
                    faltantes.append(
                        f'"{item.producto_nombre}" ya no está en el inventario'
                    )
                elif int(producto.stock) < int(item.cantidad):
                    faltantes.append(
                        f'"{producto.nombre}" solo tiene '
                        f"{producto.stock} disponibles"
                    )
                else:
                    preparados.append((producto, item))

            if faltantes:
                raise ErrorServicio(
                    "No hay stock suficiente para reactivar la factura: "
                    + "; ".join(faltantes)
                    + ".",
                    409,
                )

            for producto, item in preparados:
                producto.stock = max(
                    0, int(producto.stock) - int(item.cantidad)
                )
                if int(producto.stock) > 0:
                    producto.reposicion_pendiente = False

        factura.estado = estado
        factura.motivo_cancelacion = (
            str(motivo or "").strip()[:300] if estado == "cancelada" else ""
        )
        await sesion.flush()
        return factura.to_dict()


def _claves_meses_recientes(cantidad=8):
    hoy = date.today()
    anio, mes = hoy.year, hoy.month
    claves = []
    for _ in range(cantidad):
        claves.append((anio, mes))
        mes -= 1
        if mes == 0:
            mes = 12
            anio -= 1
    return list(reversed(claves))


async def datos_contabilidad():
    async with sesion_bd() as sesion:
        facturas = list(
            await sesion.scalars(
                select(Factura).order_by(Factura.fecha, Factura.id)
            )
        )

    validas = [factura for factura in facturas if factura.estado != "cancelada"]

    total_facturado = round(sum(float(f.total) for f in validas), 2)
    total_cobrado = round(
        sum(float(f.total) for f in validas if f.estado == "pagada"), 2
    )
    total_pendiente = round(
        sum(
            float(f.total)
            for f in validas
            if f.estado in ("pendiente", "en_envio")
        ),
        2,
    )

    facturas_pendientes = sum(
        1 for f in validas if f.estado in ("pendiente", "en_envio")
    )
    clientes_unicos = {
        f.usuario_nombre.casefold() for f in validas if f.usuario_nombre
    }
    productos_vendidos = sum(
        int(item.cantidad) for f in validas for item in f.items
    )

    por_estado = []
    for estado in ESTADOS_FACTURA:
        grupo = [f for f in facturas if f.estado == estado]
        por_estado.append({
            "estado": estado,
            "cantidad": len(grupo),
            "total": round(sum(float(f.total) for f in grupo), 2),
        })

    por_mes = []
    for anio, mes in _claves_meses_recientes():
        clave = f"{anio:04d}-{mes:02d}"
        grupo = [f for f in validas if str(f.fecha)[:7] == clave]
        por_mes.append({
            "clave": clave,
            "etiqueta": f"{MESES_CORTOS[mes - 1]} {str(anio)[2:]}",
            "total": round(sum(float(f.total) for f in grupo), 2),
            "facturas": len(grupo),
        })

    productos = {}
    for factura in validas:
        for item in factura.items:
            precio = float(item.precio_unitario)
            fila = productos.setdefault(item.producto_nombre, {
                "nombre": item.producto_nombre,
                "cantidad": 0,
                "total": 0.0,
            })
            fila["cantidad"] += int(item.cantidad)
            fila["total"] = round(
                fila["total"] + precio * int(item.cantidad), 2
            )

    top_productos = sorted(
        productos.values(),
        key=lambda fila: (fila["total"], fila["cantidad"]),
        reverse=True,
    )[:8]

    for fila in top_productos:
        fila["participacion"] = (
            round(fila["total"] / total_facturado * 100, 1)
            if total_facturado
            else 0
        )

    clientes = {}
    for factura in validas:
        usuario = factura.usuario_nombre
        if not usuario:
            continue
        clave = usuario.casefold()
        fila = clientes.setdefault(clave, {
            "usuario": usuario,
            "nombre": "",
            "facturas": 0,
            "total": 0.0,
        })
        if factura.usuario:
            fila["nombre"] = (
                f"{factura.usuario.nombres} {factura.usuario.apellidos}"
            ).strip()
        fila["facturas"] += 1
        fila["total"] = round(fila["total"] + float(factura.total), 2)

    top_clientes = sorted(
        clientes.values(),
        key=lambda fila: (fila["total"], fila["facturas"]),
        reverse=True,
    )[:5]

    ultimas = sorted(
        facturas,
        key=lambda f: (str(f.fecha), f.numero),
        reverse=True,
    )[:6]

    porcentaje_cobrado = (
        round(total_cobrado / total_facturado * 100, 1)
        if total_facturado
        else 0
    )

    return {
        "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "resumen": {
            "total_facturado": total_facturado,
            "total_cobrado": total_cobrado,
            "total_pendiente": total_pendiente,
            "porcentaje_cobrado": porcentaje_cobrado,
            "ticket_promedio": (
                round(total_facturado / len(validas), 2) if validas else 0
            ),
            "facturas_total": len(facturas),
            "facturas_validas": len(validas),
            "facturas_canceladas": len(facturas) - len(validas),
            "facturas_pendientes": facturas_pendientes,
            "clientes": len(clientes_unicos),
            "productos_vendidos": productos_vendidos,
        },
        "por_estado": por_estado,
        "por_mes": por_mes,
        "top_productos": top_productos,
        "top_clientes": top_clientes,
        "ultimas_facturas": [
            {
                "numero": f.numero,
                "fecha": str(f.fecha),
                "usuario": f.usuario_nombre,
                "total": float(f.total),
                "estado": f.estado,
            }
            for f in ultimas
        ],
    }


# ===== ENVÍOS =====
async def _facturas_disponibles(sesion):
    ocupadas = (
        select(EnvioFactura.factura_id)
        .join(Envio, Envio.id == EnvioFactura.envio_id)
        .where(Envio.estado != "cancelado")
    )
    consulta = (
        select(Factura)
        .where(
            Factura.a_domicilio.is_(True),
            Factura.estado.in_(("pendiente", "en_envio")),
            ~Factura.id.in_(ocupadas),
        )
        .order_by(Factura.fecha, Factura.id)
    )
    return list(await sesion.scalars(consulta))


async def listar_envios():
    async with sesion_bd() as sesion:
        envios = list(
            await sesion.scalars(
                select(Envio).order_by(Envio.fecha.desc(), Envio.id.desc())
            )
        )
        disponibles = await _facturas_disponibles(sesion)
        return {
            "envios": [envio.to_publico() for envio in envios],
            "facturas_disponibles": [
                factura.to_dict() for factura in disponibles
            ],
        }


async def _codigo_envio(sesion):
    for _ in range(10):
        codigo = f"ENV-{secrets.token_hex(3).upper()}"
        existe = await sesion.scalar(
            select(Envio.id).where(Envio.codigo == codigo)
        )
        if not existe:
            return codigo
    raise ErrorServicio("No se pudo generar el código del envío.", 500)


async def crear_envio(usuario_id, codigos, notas=""):
    async with sesion_bd() as sesion:
        facturas = []
        vistos = set()

        for entrada in codigos:
            codigo = str(entrada or "").strip()
            if not codigo:
                raise ErrorServicio(
                    "Hay una factura inválida en la selección.", 400
                )
            if codigo in vistos:
                raise ErrorServicio(
                    "Una factura está repetida en la selección.", 400
                )
            vistos.add(codigo)

            factura = await sesion.scalar(
                select(Factura)
                .where(Factura.codigo == codigo)
                .with_for_update(of=Factura)
            )
            if not factura:
                raise ErrorServicio(
                    "Alguna de las facturas ya no existe.", 404
                )
            if not factura.a_domicilio:
                raise ErrorServicio(
                    f"La factura #{factura.numero} no es un envío a domicilio.",
                    400,
                )
            if factura.estado in ("cancelada", "pagada"):
                raise ErrorServicio(
                    f"La factura #{factura.numero} está {factura.estado} "
                    "y no se puede agrupar.",
                    409,
                )

            ocupada = await sesion.scalar(
                select(EnvioFactura.envio_id)
                .join(Envio, Envio.id == EnvioFactura.envio_id)
                .where(
                    EnvioFactura.factura_id == factura.id,
                    Envio.estado != "cancelado",
                )
            )
            if ocupada:
                raise ErrorServicio(
                    f"La factura #{factura.numero} ya pertenece a otro envío.",
                    409,
                )

            facturas.append(factura)

        envio = Envio(
            id=uuid4().hex,
            codigo=await _codigo_envio(sesion),
            fecha=datetime.now(timezone.utc),
            estado="en_envio",
            creado_por_id=usuario_id,
            creado_por=await sesion.get(Usuario, usuario_id),
            notas=str(notas or "").strip()[:300],
        )

        for orden, factura in enumerate(facturas):
            factura.estado = "en_envio"
            factura.motivo_cancelacion = ""
            envio.lineas.append(
                EnvioFactura(factura=factura, orden=orden)
            )

        sesion.add(envio)
        await sesion.flush()
        return envio.to_publico()


async def actualizar_envio(envio_id, estado):
    async with sesion_bd() as sesion:
        envio = await sesion.get(Envio, envio_id, with_for_update=True)
        if not envio:
            raise ErrorServicio("Envío no encontrado.", 404)
        if envio.estado == "cancelado":
            raise ErrorServicio("Este envío ya está cancelado.", 409)

        for linea in envio.lineas:
            factura = linea.factura
            if not factura or factura.estado == "cancelada":
                continue
            if estado == "entregado":
                # El envío se completó: las facturas quedan cobradas.
                factura.estado = "pagada"
                factura.motivo_cancelacion = ""
            elif factura.estado == "en_envio":
                # Al cancelar el envío, las facturas vuelven a estar pendientes.
                factura.estado = "pendiente"
                factura.motivo_cancelacion = ""

        envio.estado = estado
        await sesion.flush()
        return envio.to_publico()
