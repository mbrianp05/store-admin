from .Factura import Factura
from datetime import date

class GestorFacturas:
    def __init__(self):
        self.facturas = []

    def addFactura(self, numero, carrito):
        factura = Factura(numero, carrito)
        self.facturas.append(factura)
        return factura

    def searchFactura(self, numero):
        for factura in self.facturas:
            if factura.numero == numero:
                return factura
        return None