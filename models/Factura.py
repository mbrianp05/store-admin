from datetime import date


class Factura:

    def __init__(self, numero, carrito):
        self.numero = numero
        self.fecha = date.today()
        self.items = carrito.items
        self.total = self.calcular_total()

    def calcular_total(self):
        total = 0
        for producto, cantidad in self.items:
            if hasattr(producto, 'precio_vigente'):
                precio = producto.precio_vigente(self.fecha)
            else:
                precio = producto.precio
            total += precio * cantidad
        return round(total, 2)
