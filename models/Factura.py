from datetime import date

class Factura:

    def __init__(self, numero, carrito):
        self.numero = numero
        self.fecha = date.today()
        self.items = carrito.items
        self.total = self.calcular_total()

    def calcular_total(self):
        return sum(p.precio * c for (p, c) in self.items)