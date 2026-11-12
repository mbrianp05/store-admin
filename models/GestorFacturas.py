from .Factura import Factura
from datetime import date

class GestorFacturas:
    def __init__(self):
        self.facturas = []

    def addFactura(self, numero, carrito):
        factura = Factura(numero, carrito)
        self.facturas.append(factura)
        return factura

    def searchFactura(self, numero, usuario=None):
        buscado = usuario.casefold() if usuario is not None else None
        for factura in self.facturas:
            if factura.numero != numero:
                continue
            if buscado is None or factura.usuario.casefold() == buscado:
                return factura
        return None