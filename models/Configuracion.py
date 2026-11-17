"""Configuración global del negocio (fila única)."""

from decimal import Decimal

from sqlalchemy import CheckConstraint, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Configuracion(Base):
    __tablename__ = "configuracion"
    __table_args__ = (
        CheckConstraint(
            "costo_envio >= 0", name="ck_configuracion_costo_no_negativo"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    costo_envio: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
