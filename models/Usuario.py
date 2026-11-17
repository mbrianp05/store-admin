"""Cuentas de usuario y roles."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base

ROLES = ("cliente", "empleado", "admin")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "rol IN ('cliente', 'empleado', 'admin')",
            name="ck_usuarios_rol",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario: Mapped[str] = mapped_column(String(30), nullable=False)
    nombres: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    apellidos: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(254), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(
        String(10), nullable=False, default="cliente"
    )
    creado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


# El nombre de usuario es único sin distinguir mayúsculas.
Index(
    "uq_usuarios_usuario_lower",
    func.lower(Usuario.usuario),
    unique=True,
)
