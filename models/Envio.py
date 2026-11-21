"""Envíos: agrupaciones de facturas a domicilio."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from .Factura import Factura
from .Usuario import Usuario

ESTADOS_ENVIO = ("en_envio", "entregado", "cancelado")


class Envio(Base):
    __tablename__ = "envios"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('en_envio', 'entregado', 'cancelado')",
            name="ck_envios_estado",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    codigo: Mapped[str] = mapped_column(
        String(12), nullable=False, unique=True
    )
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    estado: Mapped[str] = mapped_column(
        String(10), nullable=False, default="en_envio"
    )
    creado_por_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    creado_por_legado: Mapped[str] = mapped_column(
        String(80), nullable=False, default=""
    )
    notas: Mapped[str] = mapped_column(String(300), nullable=False, default="")

    creado_por: Mapped[Usuario | None] = relationship(lazy="selectin")
    lineas: Mapped[list["EnvioFactura"]] = relationship(
        back_populates="envio",
        cascade="all, delete-orphan",
        order_by="EnvioFactura.orden",
        lazy="selectin",
    )

    @property
    def creado_por_nombre(self):
        if self.creado_por is not None:
            return self.creado_por.usuario
        return self.creado_por_legado or ""

    def to_publico(self):
        facturas = [
            linea.factura.resumen()
            for linea in self.lineas
            if linea.factura is not None
        ]

        destinos = []
        for factura in facturas:
            destino = ", ".join(
                parte
                for parte in (factura.get("direccion"), factura.get("ubicacion"))
                if parte
            )
            if destino and destino not in destinos:
                destinos.append(destino)

        return {
            "id": self.id,
            "codigo": self.codigo,
            "fecha": self.fecha.isoformat(timespec="seconds"),
            "estado": self.estado,
            "creado_por": self.creado_por_nombre,
            "notas": self.notas or "",
            "facturas": facturas,
            "cantidad_facturas": len(facturas),
            "destinos": destinos,
            "total": round(sum(f["total"] for f in facturas), 2),
            "costo": round(sum(f["costo_envio"] for f in facturas), 2),
        }


class EnvioFactura(Base):
    __tablename__ = "envio_facturas"
    __table_args__ = (
        UniqueConstraint("envio_id", "orden", name="uq_envio_facturas_orden"),
    )

    envio_id: Mapped[str] = mapped_column(
        ForeignKey("envios.id", ondelete="CASCADE"), primary_key=True
    )
    factura_id: Mapped[int] = mapped_column(
        ForeignKey("facturas.id", ondelete="RESTRICT"), primary_key=True
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    envio: Mapped[Envio] = relationship(back_populates="lineas")
    factura: Mapped[Factura] = relationship(lazy="selectin")
