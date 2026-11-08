import json
import os
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from models import Carrito, Factura, GestorFacturas, Inventario, Producto

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
INVENTARIO_PATH = os.path.join(DATA_DIR, 'inventario.json')
FACTURAS_PATH = os.path.join(DATA_DIR, 'facturas.json')
FRONTEND_DIST = os.path.join(BASE_DIR, 'frontend', 'dist')
EXTENSIONES_FOTO = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB por foto
app.config['PROPAGATE_EXCEPTIONS'] = False
app.json.ensure_ascii = False
CORS(app)

# Inicializar datos
inventario = Inventario()
gestor_facturas = GestorFacturas()
next_invoice_number = 1

def cargar_datos():
    global next_invoice_number
    os.makedirs(DATA_DIR, exist_ok=True)

    # Cargar inventario
    try:
        with open(INVENTARIO_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for p in data:
                inventario.addProducto(Producto(**p))
    except FileNotFoundError:
        # Datos de ejemplo
        inventario.addProducto(Producto("Collar de perlas", 10.0, "unidad"))
        inventario.addProducto(Producto("Hilo de nylon", 2.0, "metro"))
        inventario.addProducto(Producto("Cuentas de cristal", 5.0, "unidad"))
        inventario.addProducto(Producto("Alambre de plata", 3.5, "metro"))
        guardar_inventario()

    # Cargar facturas
    try:
        with open(FACTURAS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            for fd in data:
                items = [(Producto(**p), c) for p, c in fd["items"]]
                carrito_temp = type("CarritoTemp", (), {"items": items})()
                factura = Factura(fd["numero"], carrito_temp)
                factura.fecha = fd["fecha"]
                factura.total = fd["total"]
                gestor_facturas.facturas.append(factura)

                if gestor_facturas.facturas:
                    max_num = max(f.numero for f in gestor_facturas.facturas)
                    next_invoice_number = max_num + 1
    except FileNotFoundError:
        pass

def guardar_inventario():
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(INVENTARIO_PATH, "w", encoding="utf-8") as f:
        json.dump([p.__dict__ for p in inventario.productos], f, default=str, ensure_ascii=False)

def guardar_facturas():
    data = []
    for f in gestor_facturas.facturas:
        data.append({
            "numero": f.numero,
            "fecha": str(f.fecha),
            "items": [(p.__dict__, c) for p, c in f.items],
            "total": f.total
        })
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(FACTURAS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, default=str, ensure_ascii=False)

# ===== SERVIR LA INTERFAZ =====
@app.route('/')
def index():
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if not os.path.exists(index_path):
        return jsonify({
            'error': 'Frontend no compilado',
            'detalle': 'Ejecutá `npm run build` dentro de frontend/.',
        }), 503
    return send_from_directory(FRONTEND_DIST, 'index.html')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

def es_ruta_api():
    return request.path == '/api' or request.path.startswith('/api/')

@app.errorhandler(413)
def foto_demasiado_grande(_error):
    return jsonify({'error': 'La foto supera el límite de 10 MB.'}), 413

@app.errorhandler(400)
def api_bad_request(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Solicitud inválida.'}), 400

@app.errorhandler(404)
def api_not_found(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Recurso no encontrado.'}), 404

@app.errorhandler(405)
def api_method_not_allowed(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Método no permitido.'}), 405

@app.errorhandler(500)
def api_internal_error(error):
    if not es_ruta_api():
        return error
    return jsonify({'error': 'Error interno del servidor.'}), 500

# ===== ENDPOINTS API =====
@app.route('/api/uploads', methods=['POST'])
def upload_foto():
    archivo = request.files.get('foto')
    if not archivo or not archivo.filename:
        return jsonify({'error': 'No se recibió ninguna foto.'}), 400

    extension = os.path.splitext(archivo.filename)[1].lower()
    if extension not in EXTENSIONES_FOTO:
        return jsonify({'error': 'Formato no admitido. Usá JPG, PNG, WEBP, GIF o AVIF.'}), 400

    if not (archivo.mimetype or '').startswith('image/'):
        return jsonify({'error': 'El archivo no parece ser una imagen.'}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    nombre_archivo = f'{uuid4().hex}{extension}'
    archivo.save(os.path.join(UPLOAD_DIR, nombre_archivo))
    return jsonify({'url': f'/uploads/{nombre_archivo}'})

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify([p.__dict__ for p in inventario.productos])

@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json(silent=True) or {}
    nombre = str(data.get('nombre') or '').strip()
    if not nombre:
        return jsonify({'error': 'El nombre no puede estar vacío.'}), 400
    if inventario.searchProducto(nombre):
        return jsonify({'error': 'Ya existe un producto con ese nombre.'}), 409

    try:
        precio = float(data.get('precio'))
    except (TypeError, ValueError):
        return jsonify({'error': 'El precio debe ser un número.'}), 400
    if precio <= 0:
        return jsonify({'error': 'El precio debe ser mayor a cero.'}), 400

    try:
        stock = int(data.get('stock', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'El stock debe ser un número entero.'}), 400
    if stock < 0:
        return jsonify({'error': 'El stock no puede ser negativo.'}), 400

    fotos = data.get('fotos')
    if not isinstance(fotos, list):
        fotos = [data['foto']] if data.get('foto') else []
    producto = Producto(
        nombre=nombre,
        precio=precio,
        unidad_medida=str(data.get('unidad_medida') or 'unidad').strip() or 'unidad',
        descripcion=str(data.get('descripcion') or '').strip(),
        fotos=[url for url in fotos if isinstance(url, str) and url],
        stock=stock,
    )
    inventario.addProducto(producto)
    guardar_inventario()
    return jsonify(producto.__dict__)

@app.route('/api/products/<nombre>', methods=['PUT'])
def update_product(nombre):
    data = request.get_json(silent=True) or {}
    producto = inventario.searchProducto(nombre)
    if not producto:
        return jsonify({'error': 'Producto no encontrado.'}), 404

    nuevo_nombre = str(data.get('nombre', producto.nombre)).strip()
    if not nuevo_nombre:
        return jsonify({'error': 'El nombre no puede estar vacío.'}), 400

    duplicado = inventario.searchProducto(nuevo_nombre)
    if duplicado and duplicado is not producto:
        return jsonify({'error': 'Ya existe un producto con ese nombre.'}), 409

    try:
        precio = float(data.get('precio', producto.precio))
    except (TypeError, ValueError):
        return jsonify({'error': 'El precio debe ser un número.'}), 400
    if precio <= 0:
        return jsonify({'error': 'El precio debe ser mayor a cero.'}), 400

    if 'stock' in data:
        try:
            stock = int(data.get('stock'))
        except (TypeError, ValueError):
            return jsonify({'error': 'El stock debe ser un número entero.'}), 400
        if stock < 0:
            return jsonify({'error': 'El stock no puede ser negativo.'}), 400
        producto.stock = stock

    producto.nombre = nuevo_nombre
    producto.precio = precio
    if 'unidad_medida' in data:
        producto.unidad_medida = str(data.get('unidad_medida') or '').strip() or 'unidad'
    if 'descripcion' in data:
        producto.descripcion = str(data.get('descripcion') or '').strip()

    fotos = data.get('fotos')
    if isinstance(fotos, list):
        producto.fotos = [url for url in fotos if isinstance(url, str) and url]
    elif data.get('foto'):
        producto.fotos = [data['foto']]

    guardar_inventario()
    return jsonify(producto.__dict__)

@app.route('/api/products/<nombre>', methods=['DELETE'])
def delete_product(nombre):
    producto = inventario.searchProducto(nombre)
    if producto:
        inventario.removeProducto(producto)
        guardar_inventario()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Product not found'}), 404

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    data = []
    for f in gestor_facturas.facturas:
        data.append({
            'numero': f.numero,
            'fecha': str(f.fecha),
            'items': [{'producto': p.__dict__, 'cantidad': c} for p, c in f.items],
            'total': f.total
        })
    return jsonify(data)

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    global next_invoice_number
    data = request.get_json(silent=True) or {}
    items = data.get('items')
    if not isinstance(items, list) or not items:
        return jsonify({'error': 'La factura no tiene artículos.'}), 400

    pedidos = {}
    for item in items:
        if not isinstance(item, dict):
            return jsonify({'error': 'Hay un artículo inválido en la factura.'}), 400

        producto_data = item.get('producto')
        nombre = producto_data.get('nombre') if isinstance(producto_data, dict) else None
        cantidad = item.get('cantidad')

        if not isinstance(nombre, str) or not nombre.strip():
            return jsonify({'error': 'Hay un artículo inválido en la factura.'}), 400
        if isinstance(cantidad, bool) or not isinstance(cantidad, int) or cantidad <= 0:
            return jsonify({'error': 'Las cantidades deben ser números enteros positivos.'}), 400

        producto = inventario.searchProducto(nombre)
        if not producto:
            return jsonify({'error': f'El producto "{nombre}" ya no está en el inventario.'}), 400

        pedidos[producto.nombre] = pedidos.get(producto.nombre, 0) + cantidad

    carrito_temp = Carrito()
    for nombre, cantidad in pedidos.items():
        producto = inventario.searchProducto(nombre)
        if cantidad > producto.stock:
            return jsonify({
                'error': (
                    f'No hay stock suficiente de "{producto.nombre}". '
                    f'Disponible: {producto.stock}.'
                )
            }), 409
        carrito_temp.addChart(producto, cantidad)

    factura = Factura(next_invoice_number, carrito_temp)
    gestor_facturas.facturas.append(factura)
    next_invoice_number += 1

    for producto, cantidad in carrito_temp.items:
        producto.stock -= cantidad

    guardar_inventario()
    guardar_facturas()

    return jsonify({
        'numero': factura.numero,
        'fecha': str(factura.fecha),
        'items': [{'producto': p.__dict__, 'cantidad': c} for p, c in factura.items],
        'total': factura.total
    })

if __name__ == '__main__':
    cargar_datos()
    app.run(debug=True, port=5000)
