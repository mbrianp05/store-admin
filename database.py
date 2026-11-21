"""Conexión asíncrona a PostgreSQL y puente con Flask.

Flask es WSGI y síncrono, mientras que SQLAlchemy usa ``asyncpg``. Para no
crear y cerrar un bucle de eventos en cada petición, se mantiene un único
bucle dedicado en un hilo de fondo. Las vistas síncronas llaman a
``ejecutar()`` y esperan el resultado de la corrutina.
"""

import asyncio
import os
import threading
from contextlib import asynccontextmanager
from decimal import Decimal

from dotenv import load_dotenv
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# La configuración de la base vive en ``.env`` (ignorado por git). Las
# variables ya definidas en el entorno real tienen prioridad.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/venture",
)

# Las URLs de SQLAlchemy para psycopg suelen venir como ``postgresql://``;
# normalizamos para que también funcionen con el driver asíncrono.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)


class Base(DeclarativeBase):
    """Base declarativa común para todos los modelos de ``models/``."""


motor = create_async_engine(DATABASE_URL, pool_pre_ping=True)
SesionLocal = async_sessionmaker(
    motor,
    class_=AsyncSession,
    expire_on_commit=False,
)


def _iniciar_bucle():
    asyncio.set_event_loop(_bucle)
    _bucle.run_forever()


_bucle = asyncio.new_event_loop()
_hilo = threading.Thread(
    target=_iniciar_bucle,
    name="postgres-async",
    daemon=True,
)
_hilo.start()


def ejecutar(corutina):
    """Ejecuta una corrutina en el bucle dedicado y devuelve su resultado."""
    return asyncio.run_coroutine_threadsafe(corutina, _bucle).result()


@asynccontextmanager
async def sesion_bd():
    """Sesión con commit automático y rollback ante cualquier error."""
    async with SesionLocal() as sesion:
        try:
            yield sesion
            await sesion.commit()
        except BaseException:
            await sesion.rollback()
            raise


async def crear_tablas():
    """Crea las tablas declaradas en ``models/`` si aún no existen."""
    # Importar los modelos registra sus tablas en ``Base.metadata``.
    import models  # noqa: F401

    async with motor.begin() as conexion:
        await conexion.run_sync(Base.metadata.create_all)
        # Las facturas de un envío cancelado pueden volver a agruparse en otro
        # envío; el índice único antiguo lo impedía con un error 500.
        await conexion.execute(text(
            "ALTER TABLE envio_facturas "
            "DROP CONSTRAINT IF EXISTS envio_facturas_factura_id_key"
        ))


async def inicializar_base(sembrar=True):
    """Prepara el esquema y los datos mínimos (configuración y ejemplos)."""
    from models import Configuracion, Producto

    await crear_tablas()

    async with SesionLocal() as sesion:
        try:
            configuracion = await sesion.get(Configuracion, 1)
            if configuracion is None:
                sesion.add(Configuracion(id=1, costo_envio=Decimal("0.00")))

            if sembrar:
                total = await sesion.scalar(
                    select(func.count()).select_from(Producto)
                )
                if not total:
                    ejemplos = (
                        ("Collar de perlas", Decimal("10.00"), "unidad"),
                        ("Hilo de nylon", Decimal("2.00"), "metro"),
                        ("Cuentas de cristal", Decimal("5.00"), "unidad"),
                        ("Alambre de plata", Decimal("3.50"), "metro"),
                    )
                    for nombre, precio, unidad in ejemplos:
                        sesion.add(
                            Producto(
                                nombre=nombre,
                                precio=precio,
                                unidad_medida=unidad,
                            )
                        )

            await sesion.commit()
        except BaseException:
            await sesion.rollback()
            raise
