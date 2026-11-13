from datetime import date


def _fecha_iso(valor):
    """Devuelve la fecha en formato ISO (YYYY-MM-DD) o None si no es válida."""
    if not valor:
        return None
    try:
        return date.fromisoformat(str(valor)[:10]).isoformat()
    except ValueError:
        return None


class Producto:
    def __init__(
        self,
        nombre,
        precio,
        unidad_medida="unidad",
        descripcion="",
        foto=None,
        fotos=None,
        stock=0,
        categoria="",
        descuento=None,
        reposicion_pendiente=False,
    ):
        self.nombre = nombre
        self.precio = precio
        self.unidad_medida = unidad_medida  # texto libre: "unidad", "metro", "par"...
        self.descripcion = descripcion
        self.categoria = str(categoria or "").strip()
        if fotos is None:
            fotos = [foto] if foto else []
        self.fotos = list(fotos)  # la primera es la portada
        try:
            self.stock = max(0, int(stock))
        except (TypeError, ValueError):
            self.stock = 0
        self.descuento = self.normalizar_descuento(descuento)
        # Solo tiene sentido avisar de una reposición mientras no haya stock.
        self.reposicion_pendiente = bool(reposicion_pendiente) and self.stock <= 0

    @staticmethod
    def normalizar_descuento(descuento):
        """Valida y normaliza un descuento con porcentaje y periodo."""
        if not isinstance(descuento, dict):
            return None

        try:
            porcentaje = float(descuento.get("porcentaje"))
        except (TypeError, ValueError):
            return None

        desde = _fecha_iso(descuento.get("desde"))
        hasta = _fecha_iso(descuento.get("hasta"))
        if not (0 < porcentaje < 100) or not desde or not hasta or desde > hasta:
            return None

        return {
            "porcentaje": round(porcentaje, 2),
            "desde": desde,
            "hasta": hasta,
        }

    def descuento_vigente(self, fecha=None):
        """Devuelve el descuento si la fecha cae dentro de su periodo."""
        if not self.descuento:
            return None
        referencia = _fecha_iso(fecha) or date.today().isoformat()
        if self.descuento["desde"] <= referencia <= self.descuento["hasta"]:
            return self.descuento
        return None

    def precio_vigente(self, fecha=None):
        """Precio con descuento aplicado cuando corresponde."""
        vigente = self.descuento_vigente(fecha)
        if not vigente:
            return self.precio
        return round(self.precio * (100 - vigente["porcentaje"]) / 100, 2)

    def actualizar_info(
        self,
        precio=None,
        descripcion=None,
        fotos=None,
        stock=None,
        reposicion_pendiente=None,
    ):
        if precio is not None:
            self.precio = precio
        if descripcion is not None:
            self.descripcion = descripcion
        if fotos is not None:
            self.fotos = list(fotos)
        if stock is not None:
            try:
                self.stock = max(0, int(stock))
            except (TypeError, ValueError):
                pass
        if reposicion_pendiente is not None:
            self.reposicion_pendiente = bool(reposicion_pendiente)
        if self.stock > 0:
            self.reposicion_pendiente = False
