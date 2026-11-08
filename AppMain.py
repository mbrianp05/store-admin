import json
import os

from models import Carrito, Factura, GestorFacturas, Inventario, Producto

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INVENTARIO_PATH = os.path.join(DATA_DIR, 'inventario.json')
FACTURAS_PATH = os.path.join(DATA_DIR, 'facturas.json')

class AppMain:
    def __init__(self):
        self.inventario = Inventario()
        self.carrito = Carrito()
        self.gestor_facturas = GestorFacturas()
        self.numero_factura = 1

        self.cargar_inventario()
        self.cargar_facturas()

    def guardar_inventario(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(INVENTARIO_PATH, "w", encoding="utf-8") as f:
            json.dump([p.__dict__ for p in self.inventario.productos], f, ensure_ascii=False)

    def cargar_inventario(self):
        try:
            with open(INVENTARIO_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                for p in data:
                    self.inventario.addProducto(Producto(**p))
        except FileNotFoundError:
            self.inventario.addProducto(Producto("Collar de perlas", 10.0, "unidad"))
            self.inventario.addProducto(Producto("Hilo de nylon", 2.0, "metro"))

    def guardar_facturas(self):
        data = []
        for f in self.gestor_facturas.facturas:
            data.append({
                "numero": f.numero,
                "fecha": str(f.fecha),
                "items": [(p.__dict__, c) for p, c in f.items],
                "total": f.total
            })
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(FACTURAS_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)

    def cargar_facturas(self):
        try:
            with open(FACTURAS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                for fd in data:
                    items = [(Producto(**p), c) for p, c in fd["items"]]
                    carrito_temp = type("CarritoTemp", (), {"items": items})()
                    factura = Factura(fd["numero"], carrito_temp)
                    factura.fecha = fd["fecha"]
                    factura.total = fd["total"]
                    self.gestor_facturas.facturas.append(factura)

                    if self.gestor_facturas.facturas:
                        max_num = max(f.numero for f in self.gestor_facturas.facturas)
                        self.numero_factura = max_num + 1
                    else:
                        self.numero_factura = 1
        except FileNotFoundError:
            pass


    def mostrar_menu(self):
        print("\n--- MENÚ PRINCIPAL ---")
        print("1. Listar productos")
        print("2. Agregar producto al carrito")
        print("3. Mostrar carrito")
        print("4. Generar factura")
        print("5. Listar facturas")
        print("6. Salir")

    def ejecutar(self):
        while True:
            self.mostrar_menu()
            opcion = input("Seleccione una opción: ")

            if opcion == "1":
                self.inventario.listProductos()

            elif opcion == "2":
                self.inventario.listProductos()
                indice = int(input("Ingrese el número del producto: "))
                cantidad = int(input("Ingrese la cantidad/metros: "))
                producto = self.inventario.productos[indice - 1]
                self.carrito.addChart(producto, cantidad)

            elif opcion == "3":
                self.carrito.mostrar_carrito()

            elif opcion == "4":
                factura = self.gestor_facturas.addFactura(self.numero_factura, self.carrito)
                factura.mostrar_factura()
                self.numero_factura += 1
                self.carrito.vaciar_carrito()
                self.guardar_facturas()

            elif opcion == "5":
                self.gestor_facturas.showFacturas()

            elif opcion == "6":
                print("Guardando datos y saliendo...")
                self.guardar_inventario()
                self.guardar_facturas()
                break

            else:
                print("Opción inválida, intente de nuevo.")

    

if __name__ == "__main__":
    app = AppMain()
    app.ejecutar()