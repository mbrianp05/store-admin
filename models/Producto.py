"""Productos, categorías, fotos y descuentos."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _fecha_iso(valor):
    """Devuelve la fecha en formato ISO (YYYY-MM-DD) o None si no es válida."""
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10]).isoformat()
    except ValueError:
        return None


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)


Index(
    "uq_categorias_nombre_lower",
    func.lower(Categoria.nombre),
    unique=True,
)


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("precio > 0", name="ck_productos_precio_positivo"),
        CheckConstraint("stock >= 0", name="ck_productos_stock_no_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(
        String(30), nullable=False, default="unidad"
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False, default="")
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reposicion_pendiente: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    categoria_id: Mapped[int | None] = mapped_column(
        ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True
    )
    creado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    categoria: Mapped[Categoria | None] = relationship(lazy="selectin")
    fotos: Mapped[list["ProductoFoto"]] = relationship(
        back_populates="producto",
        cascade="all, delete-orphan",
        order_by="ProductoFoto.orden",
        lazy="selectin",
    )
    descuento: Mapped["Descuento | None"] = relationship(
        back_populates="producto",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )

    def descuento_vigente(self, fecha=None):
        """Devuelve el descuento si la fecha cae dentro de su periodo."""
        descuento = self.descuento
        if not descuento:
            return None
        referencia = _fecha_iso(fecha) or date.today().isoformat()
        desde = descuento.desde.isoformat()
        hasta = descuento.hasta.isoformat()
        if desde <= referencia <= hasta:
            return {
                "porcentaje": float(descuento.porcentaje),
                "desde": desde,
                "hasta": hasta,
            }
        return None

    def precio_vigente(self, fecha=None):
        """Precio con descuento aplicado cuando corresponde."""
        vigente = self.descuento_vigente(fecha)
        precio = float(self.precio)
        if not vigente:
            return precio
        return round(precio * (100 - vigente["porcentaje"]) / 100, 2)

    def to_dict(self):
        descuento = None
        if self.descuento:
            descuento = {
                "porcentaje": float(self.descuento.porcentaje),
                "desde": self.descuento.desde.isoformat(),
                "hasta": self.descuento.hasta.isoformat(),
            }
        return {
            "nombre": self.nombre,
            "precio": float(self.precio),
            "unidad_medida": self.unidad_medida,
            "descripcion": self.descripcion,
            "categoria": self.categoria.nombre if self.categoria else "",
            "fotos": [foto.url for foto in self.fotos],
            "stock": int(self.stock),
            "descuento": descuento,
            "reposicion_pendiente": bool(self.reposicion_pendiente)
            and int(self.stock) <= 0,
        }


class ProductoFoto(Base):
    __tablename__ = "producto_fotos"

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    producto: Mapped[Producto] = relationship(back_populates="fotos")


class Descuento(Base):
    __tablename__ = "producto_descuentos"
    __table_args__ = (
        CheckConstraint(
            "porcentaje > 0 AND porcentaje < 100",
            name="ck_descuentos_porcentaje",
        ),
        CheckConstraint("hasta >= desde", name="ck_descuentos_fechas"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    porcentaje: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    desde: Mapped[date] = mapped_column(Date, nullable=False)
    hasta: Mapped[date] = mapped_column(Date, nullable=False)

    producto: Mapped[Producto] = relationship(back_populates="descuento")
