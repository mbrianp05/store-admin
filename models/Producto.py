class Producto:
    def __init__(self, nombre, precio, unidad_medida="unidad", descripcion="", foto=None, fotos=None, stock=0):
        self.nombre = nombre
        self.precio = precio
        self.unidad_medida = unidad_medida  # texto libre: "unidad", "metro", "par"...
        self.descripcion = descripcion
        if fotos is None:
            fotos = [foto] if foto else []
        self.fotos = list(fotos)  # la primera es la portada
        try:
            self.stock = max(0, int(stock))
        except (TypeError, ValueError):
            self.stock = 0

    def actualizar_info(self, precio=None, descripcion=None, fotos=None, stock=None):
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
