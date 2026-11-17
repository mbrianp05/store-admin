"""Importa los datos JSON históricos de ``data/`` a PostgreSQL.

Uso:
    py migrar_json.py            # importa solo si la base está vacía
    py migrar_json.py --forzar   # vacía las tablas y vuelve a importar

Lee ``data/usuarios.json``, ``inventario.json``, ``facturas.json``,
``envios.json`` y ``config.json``. Las facturas y envíos de usuarios que ya no
existen se conservan con su nombre original como dato histórico.
"""

import argparse
import json
import os
from datetime import date, datetime, time, timezone
from decimal import Decimal

from sqlalchemy import func, select, text

from database import ejecutar, inicializar_base, sesion_bd
from models import (
    Categoria,
    Configuracion,
    Descuento,
    Envio,
    EnvioFactura,
    ESTADOS_FACTURA,
    Factura,
    FacturaItem,
    Producto,
    ProductoFoto,
    Usuario,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def leer_json(nombre):
    ruta = os.path.join(DATA_DIR, nombre)
    try:
        with open(ruta, "r", encoding="utf-8") as archivo:
            return json.load(archivo)
    except FileNotFoundError:
        return None


def fecha_iso(valor, defecto=None):
    try:
        return date.fromisoformat(str(valor)[:10])
    except (TypeError, ValueError):
        return defecto or date.today()


def fecha_hora_iso(valor):
    try:
        return datetime.fromisoformat(str(valor))
    except (TypeError, ValueError):
        return datetime.now(timezone.utc)


def precio_unitario_json(producto, fecha):
    precio = float(producto.get("precio") or 0)
    descuento = producto.get("descuento")
    if isinstance(descuento, dict):
        try:
            desde = str(descuento["desde"])[:10]
            hasta = str(descuento["hasta"])[:10]
            referencia = fecha.isoformat()
            if desde <= referencia <= hasta:
                precio = round(
                    precio * (100 - float(descuento["porcentaje"])) / 100, 2
                )
        except (KeyError, TypeError, ValueError):
            pass
    return precio


async def obtener_categoria(sesion, nombre):
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


async def importar(forzar=False):
    await inicializar_base(sembrar=False)

    usuarios_json = leer_json("usuarios.json") or []
    inventario_json = leer_json("inventario.json") or []
    facturas_json = leer_json("facturas.json") or []
    envios_json = leer_json("envios.json") or []
    config_json = leer_json("config.json") or {}

    async with sesion_bd() as sesion:
        if forzar:
            await sesion.execute(text(
                "TRUNCATE TABLE envio_facturas, envios, factura_items, "
                "facturas, producto_fotos, producto_descuentos, productos, "
                "categorias, usuarios, configuracion RESTART IDENTITY CASCADE"
            ))

        existentes = 0
        for modelo in (Usuario, Producto, Factura, Envio):
            existentes += int(
                await sesion.scalar(select(func.count()).select_from(modelo))
            )
        if existentes and not forzar:
            raise SystemExit(
                "La base de datos ya tiene datos. Usa --forzar para vaciarla "
                "y volver a importar."
            )

        configuracion = await sesion.get(Configuracion, 1)
        if not configuracion:
            configuracion = Configuracion(id=1)
            sesion.add(configuracion)
        try:
            configuracion.costo_envio = Decimal(
                str(config_json.get("costo_envio") or 0)
            )
        except (TypeError, ValueError):
            configuracion.costo_envio = Decimal("0.00")

        usuarios_por_nombre = {}
        for datos in usuarios_json:
            usuario = str(datos.get("usuario") or "").strip()
            if not usuario:
                continue
            cuenta = Usuario(
                usuario=usuario,
                nombres=str(datos.get("nombres") or ""),
                apellidos=str(datos.get("apellidos") or ""),
                email=str(datos.get("email") or ""),
                password_hash=str(datos.get("password_hash") or ""),
                rol=datos.get("rol") if datos.get("rol") in (
                    "cliente", "empleado", "admin"
                ) else "cliente",
                creado=fecha_hora_iso(datos.get("creado")),
            )
            sesion.add(cuenta)
            usuarios_por_nombre[usuario.casefold()] = cuenta
        await sesion.flush()

        productos_por_nombre = {}
        for datos in inventario_json:
            try:
                stock = max(0, int(datos.get("stock") or 0))
            except (TypeError, ValueError):
                stock = 0
            producto = Producto(
                nombre=str(datos.get("nombre") or "").strip(),
                precio=Decimal(str(datos.get("precio") or 0)),
                unidad_medida=str(datos.get("unidad_medida") or "unidad"),
                descripcion=str(datos.get("descripcion") or ""),
                stock=stock,
                reposicion_pendiente=bool(datos.get("reposicion_pendiente"))
                and stock <= 0,
            )
            producto.categoria = await obtener_categoria(
                sesion, datos.get("categoria")
            )
            producto.fotos = [
                ProductoFoto(url=str(url), orden=indice)
                for indice, url in enumerate(datos.get("fotos") or [])
            ]
            descuento = datos.get("descuento")
            if isinstance(descuento, dict):
                producto.descuento = Descuento(
                    porcentaje=Decimal(str(descuento.get("porcentaje") or 0)),
                    desde=fecha_iso(descuento.get("desde")),
                    hasta=fecha_iso(descuento.get("hasta")),
                )
            sesion.add(producto)
            productos_por_nombre[producto.nombre.casefold()] = producto
        await sesion.flush()

        facturas_por_codigo = {}
        codigos_usados = set()
        for datos in facturas_json:
            usuario_nombre = str(datos.get("usuario") or "").strip()
            cuenta = usuarios_por_nombre.get(usuario_nombre.casefold())
            fecha = fecha_iso(datos.get("fecha"))
            envio = datos.get("envio") if isinstance(datos.get("envio"), dict) else {}

            codigo = str(datos.get("codigo") or "").strip().upper()
            if not codigo or codigo in codigos_usados:
                for _ in range(20):
                    candidato = os.urandom(4).hex().upper()
                    if candidato not in codigos_usados:
                        codigo = candidato
                        break
            codigos_usados.add(codigo)

            estado = datos.get("estado")
            if estado not in ESTADOS_FACTURA:
                estado = "pendiente"

            factura = Factura(
                codigo=codigo,
                numero=int(datos.get("numero") or 1),
                usuario_id=cuenta.id if cuenta else None,
                usuario=cuenta,
                usuario_legado=usuario_nombre if not cuenta else "",
                fecha=fecha,
                creado_en=datetime.combine(
                    fecha, time.min, tzinfo=timezone.utc
                ),
                subtotal=Decimal(str(datos.get("subtotal") or 0)),
                costo_envio=Decimal(str(datos.get("costo_envio") or 0)),
                total=Decimal(str(datos.get("total") or 0)),
                estado=estado,
                a_domicilio=bool(envio.get("a_domicilio")),
                ubicacion=str(envio.get("ubicacion") or "")[:120],
                direccion=str(envio.get("direccion") or "")[:200],
                motivo_cancelacion=str(
                    datos.get("motivo_cancelacion") or ""
                )[:300] if estado == "cancelada" else "",
            )

            for entrada in datos.get("items") or []:
                try:
                    producto_json, cantidad = entrada
                except (TypeError, ValueError):
                    continue
                nombre = str(producto_json.get("nombre") or "")
                producto = productos_por_nombre.get(nombre.casefold())
                factura.items.append(FacturaItem(
                    producto=producto,
                    producto_nombre=nombre,
                    unidad_medida=str(
                        producto_json.get("unidad_medida") or "unidad"
                    ),
                    precio_unitario=Decimal(
                        str(precio_unitario_json(producto_json, fecha))
                    ),
                    cantidad=max(1, int(cantidad)),
                ))

            sesion.add(factura)
            facturas_por_codigo[codigo] = factura
        await sesion.flush()

        for datos in envios_json:
            creador = str(datos.get("creado_por") or "").strip()
            cuenta = usuarios_por_nombre.get(creador.casefold())
            envio = Envio(
                id=str(datos.get("id") or os.urandom(16).hex())[:32],
                codigo=str(datos.get("codigo") or "").strip()[:12],
                fecha=fecha_hora_iso(datos.get("fecha")),
                estado=datos.get("estado")
                if datos.get("estado") in ("en_envio", "entregado", "cancelado")
                else "en_envio",
                creado_por_id=cuenta.id if cuenta else None,
                creado_por=cuenta,
                creado_por_legado=creador if not cuenta else "",
                notas=str(datos.get("notas") or "")[:300],
            )
            for orden, referencia in enumerate(datos.get("facturas") or []):
                codigo = (
                    referencia.get("codigo")
                    if isinstance(referencia, dict)
                    else referencia
                )
                factura = facturas_por_codigo.get(str(codigo or "").upper())
                if factura is None:
                    print(
                        f"  aviso: el envío {envio.codigo} referencia una "
                        f"factura inexistente ({codigo})."
                    )
                    continue
                envio.lineas.append(EnvioFactura(factura=factura, orden=orden))
            sesion.add(envio)
        await sesion.flush()

        print("Importación completada:")
        print(f"  usuarios:   {len(usuarios_por_nombre)}")
        print(f"  productos:  {len(productos_por_nombre)}")
        print(f"  facturas:   {len(facturas_por_codigo)}")
        print(f"  envíos:     {len(envios_json)}")


def main():
    parser = argparse.ArgumentParser(
        description="Importa data/*.json a PostgreSQL."
    )
    parser.add_argument(
        "--forzar",
        action="store_true",
        help="Vacía las tablas antes de importar.",
    )
    argumentos = parser.parse_args()
    ejecutar(importar(forzar=argumentos.forzar))


if __name__ == "__main__":
    main()
