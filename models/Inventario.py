from Producto import Producto

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

    def listProductos(self):
        print("\n--- INVENTARIO ---")
        if not self.productos:
            print("Inventario vacío.")
        for i, producto in enumerate(self.productos, start=1):
            unidad = "metros" if producto.unidad_medida == "metro" else "unidades"
            print(f"{i}. {producto.nombre} - Precio: {producto.precio} ({unidad})")

