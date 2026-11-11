from .Producto import Producto

class Inventario:
    def __init__(self):
        self.productos = []

    def addProducto(self, producto):
        self.productos.append(producto)

    def removeProducto(self, producto):
        self.productos = [p for p in self.productos if p != producto]

    def searchProducto(self, nombre):
        for producto in self.productos:
            if producto.nombre.lower() == nombre.lower():
                return producto
        return None

