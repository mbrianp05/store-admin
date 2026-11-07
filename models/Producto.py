class Producto:
    def __init__(self, nombre, precio, unidad_medida="unidad", descripcion="", foto=None):
        self.nombre = nombre
        self.precio = precio
        self.unidad_medida = unidad_medida  # "unidad" o "metro"
        self.descripcion = descripcion
        self.foto = foto

    def mostrar_detalle(self):
        unidad = "metros" if self.unidad_medida == "metro" else "unidades"
        print(f"{self.nombre} - Precio: {self.precio} por {unidad}")
        if self.descripcion:
            print(f"Descripción: {self.descripcion}")
        if self.foto:
            print(f"Foto: {self.foto}")

    def actualizar_info(self, precio=None, descripcion=None, foto=None):
        if precio is not None:
            self.precio = precio
        if descripcion is not None:
            self.descripcion = descripcion
        if foto is not None:
            self.foto = foto
