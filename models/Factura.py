from datetime import date

class Factura:

    def __init__(self, numero, carrito):
        self.numero = numero
        self.fecha = date.today()
        self.items = carrito.items
        self.total = self.calcular_total()

    def calcular_total(self):
        return sum(p.precio * c for (p, c) in self.items)
    
    def mostrar_factura(self):
        print(f"\nFactura N° {self.numero} - Fecha: {self.fecha}")
        for producto, cantidad in self.items:
            subtotal = producto.precio * cantidad
            print(f"{producto.nombre} x {cantidad} {producto.unidad_medida} = {subtotal}")
        print(f"TOTAL: {self.total}")