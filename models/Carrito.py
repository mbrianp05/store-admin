from .Producto import Producto

class Carrito:
    def __init__(self):
        self.items = []

    def addChart(self, producto, cantidad):
        for i, (p, c) in enumerate(self.items):
            if p == producto:
                self.items[i] = (p, c + cantidad)
                return
        self.items.append((producto, cantidad))

    def removeChart(self, producto):
        self.items = [(p, c) for (p, c) in self.items if p != producto]

    def calcTotal(self):
        total = 0
        for producto, cantidad in self.items:
            if hasattr(producto, 'precio_vigente'):
                precio = producto.precio_vigente()
            else:
                precio = producto.precio
            total += precio * cantidad
        return round(total, 2)

    def vaciar_carrito(self):
        self.items = []
