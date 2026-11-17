"""Facturas, sus artículos y estados."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from .Producto import Producto
from .Usuario import Usuario


ESTADOS_FACTURA = ("pendiente", "en_envio", "pagada", "cancelada")
ESTADO_POR_DEFECTO = "pendiente"


def normalizar_envio(envio):
    """Devuelve un envío consistente: a domicilio, ubicación y dirección."""
    if not isinstance(envio, dict):
        envio = {}

    return {
        "a_domicilio": bool(envio.get("a_domicilio")),
        "ubicacion": str(envio.get("ubicacion") or "").strip()[:120],
        "direccion": str(envio.get("direccion") or "").strip()[:200],
    }


def estado_inicial(_envio=None):
    """Toda factura nueva empieza pendiente, con o sin envío."""
    return ESTADO_POR_DEFECTO


class Factura(Base):
    __tablename__ = "facturas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente', 'en_envio', 'pagada', 'cancelada')",
            name="ck_facturas_estado",
        ),
        UniqueConstraint(
            "usuario_id", "numero", name="uq_facturas_usuario_numero"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(
        String(8), nullable=False, unique=True
    )
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    # Solo se usa en facturas históricas importadas cuyo usuario ya no existe.
    usuario_legado: Mapped[str] = mapped_column(
        String(80), nullable=False, default=""
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    costo_envio: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(10), nullable=False, default=ESTADO_POR_DEFECTO
    )
    a_domicilio: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    ubicacion: Mapped[str] = mapped_column(
        String(120), nullable=False, default=""
    )
    direccion: Mapped[str] = mapped_column(
        String(200), nullable=False, default=""
    )
    motivo_cancelacion: Mapped[str] = mapped_column(
        String(300), nullable=False, default=""
    )

    usuario: Mapped[Usuario | None] = relationship(lazy="selectin")
    items: Mapped[list["FacturaItem"]] = relationship(
        back_populates="factura",
        cascade="all, delete-orphan",
        order_by="FacturaItem.id",
        lazy="selectin",
    )

    @property
    def usuario_nombre(self):
        if self.usuario is not None:
            return self.usuario.usuario
        return self.usuario_legado or ""

    @property
    def envio(self):
        return {
            "a_domicilio": bool(self.a_domicilio),
            "ubicacion": self.ubicacion or "",
            "direccion": self.direccion or "",
        }

    def contenido_qr(self):
        """Texto que se codifica en el QR; solo aplica a envíos a domicilio."""
        if not self.a_domicilio:
            return ""
        return (
            f"VENTURE|FAC-{self.numero:04d}|{self.fecha}|"
            f"{float(self.total):.2f}|{self.usuario_nombre or 'Cliente'}|"
            f"{self.direccion}|{self.codigo}"
        )

    def resumen(self):
        """Datos compactos que se muestran dentro de un envío."""
        return {
            "codigo": self.codigo,
            "numero": self.numero,
            "fecha": str(self.fecha),
            "usuario": self.usuario_nombre,
            "total": float(self.total),
            "costo_envio": float(self.costo_envio),
            "estado": self.estado,
            "ubicacion": self.ubicacion or "",
            "direccion": self.direccion or "",
        }

    def to_dict(self):
        return {
            "numero": self.numero,
            "fecha": str(self.fecha),
            "items": [item.to_dict() for item in self.items],
            "subtotal": float(self.subtotal),
            "costo_envio": float(self.costo_envio),
            "total": float(self.total),
            "estado": self.estado,
            "envio": dict(self.envio),
            "usuario": self.usuario_nombre,
            "codigo": self.codigo,
            "qr": self.contenido_qr(),
            "motivo_cancelacion": self.motivo_cancelacion or "",
        }


class FacturaItem(Base):
    __tablename__ = "factura_items"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_factura_items_cantidad"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    factura_id: Mapped[int] = mapped_column(
        ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int | None] = mapped_column(
        ForeignKey("productos.id", ondelete="SET NULL"), nullable=True
    )
    # Copia histórica: la factura debe seguir siendo legible si el producto
    # se elimina o cambia de nombre o precio.
    producto_nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(
        String(30), nullable=False, default="unidad"
    )
    precio_unitario: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)

    factura: Mapped[Factura] = relationship(back_populates="items")
    producto: Mapped[Producto | None] = relationship(lazy="selectin")

    def to_dict(self):
        if self.producto is not None:
            producto = self.producto.to_dict()
        else:
            producto = {
                "nombre": self.producto_nombre,
                "precio": float(self.precio_unitario),
                "unidad_medida": self.unidad_medida,
                "descripcion": "",
                "categoria": "",
                "fotos": [],
                "stock": 0,
                "descuento": None,
                "reposicion_pendiente": False,
            }
        return {"producto": producto, "cantidad": int(self.cantidad)}
