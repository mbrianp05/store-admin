from Producto import Producto

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
        return sum(p.precio * c for (p, c) in self.items)

    def vaciar_carrito(self):
        self.items = []

    def mostrar_carrito(self):
        for producto, cantidad in self.items:
            print(f"{producto.nombre} x {cantidad} = {producto.precio * cantidad}")
        print(f"Total: {self.calcTotal()}")