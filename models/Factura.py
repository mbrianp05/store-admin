import secrets
from datetime import date


ESTADOS_FACTURA = ("pendiente", "en_envio", "pagada", "cancelada")
ESTADO_POR_DEFECTO = "pendiente"


def normalizar_envio(envio):
    """Devuelve un envío consistente: a domicilio, ubicación y dirección."""
    if not isinstance(envio, dict):
        envio = {}

    a_domicilio = bool(envio.get("a_domicilio"))
    ubicacion = str(envio.get("ubicacion") or "").strip()[:120]
    direccion = str(envio.get("direccion") or "").strip()[:200]

    return {
        "a_domicilio": a_domicilio,
        "ubicacion": ubicacion,
        "direccion": direccion,
    }


def estado_inicial(_envio=None):
    """Toda factura nueva empieza pendiente, con o sin envío."""
    return ESTADO_POR_DEFECTO


class Factura:

    def __init__(
        self,
        numero,
        carrito,
        estado=None,
        envio=None,
        usuario="",
        codigo=None,
        costo_envio=0,
        motivo_cancelacion="",
    ):
        self.numero = numero
        self.fecha = date.today()
        self.items = carrito.items
        self.envio = normalizar_envio(envio)
        self.subtotal = self.calcular_total()
        self.costo_envio = (
            round(max(0.0, float(costo_envio or 0)), 2)
            if self.envio["a_domicilio"]
            else 0
        )
        self.total = round(self.subtotal + self.costo_envio, 2)
        self.estado = estado if estado in ESTADOS_FACTURA else estado_inicial(self.envio)
        self.usuario = str(usuario or "").strip()[:80]
        self.codigo = codigo or secrets.token_hex(4).upper()
        self.motivo_cancelacion = (
            str(motivo_cancelacion or "").strip()[:300]
            if self.estado == "cancelada"
            else ""
        )

    def calcular_total(self):
        total = 0
        for producto, cantidad in self.items:
            if hasattr(producto, 'precio_vigente'):
                precio = producto.precio_vigente(self.fecha)
            else:
                precio = producto.precio
            total += precio * cantidad
        return round(total, 2)

    def contenido_qr(self):
        """Texto que se codifica en el QR; solo aplica a envíos a domicilio."""
        if not self.envio["a_domicilio"]:
            return ""
        return (
            f"MOSTRADOR|FAC-{self.numero:04d}|{self.fecha}|"
            f"{self.total:.2f}|{self.usuario or 'Cliente'}|"
            f"{self.envio['direccion']}|{self.codigo}"
        )

    def cambiar_estado(self, estado, motivo_cancelacion=""):
        if estado not in ESTADOS_FACTURA:
            return False
        self.estado = estado
        self.motivo_cancelacion = (
            str(motivo_cancelacion or "").strip()[:300]
            if estado == "cancelada"
            else ""
        )
        return True

    def to_dict(self):
        return {
            "numero": self.numero,
            "fecha": str(self.fecha),
            "items": [{"producto": p.__dict__, "cantidad": c} for p, c in self.items],
            "subtotal": self.subtotal,
            "costo_envio": self.costo_envio,
            "total": self.total,
            "estado": self.estado,
            "envio": dict(self.envio),
            "usuario": self.usuario,
            "codigo": self.codigo,
            "qr": self.contenido_qr(),
            "motivo_cancelacion": self.motivo_cancelacion,
        }
