# 📦 Venture — Sistema de Gestión de Inventario y Facturación

Aplicación web para gestionar inventario, armar un carrito y emitir facturas. El backend es una API Flask y el frontend es una SPA en React 19 + Vite + Tailwind CSS v4. La interfaz está en español, usa un tema oscuro y está pensada para pequeños comercios.

## 🧭 Descripción

La aplicación permite:

- **Gestionar productos**: crear, editar, listar y eliminar artículos del inventario.
- **Organizar el catálogo** por categorías y buscar productos por nombre o descripción en tiempo real.
- **Controlar stock**: cada producto tiene stock disponible; se valida al agregar al carrito y al emitir la factura.
- **Programar descuentos** por porcentaje y periodo de vigencia.
- **Cargar fotos**: hasta 8 imágenes por producto, con la primera como portada.
- **Administrar un carrito** con cantidades, subtotales y total en pesos cubanos (CUP).
- **Elegir la entrega**: retiro en el local o envío a domicilio con costo fijo configurable.
- **Emitir facturas** con numeración automática por usuario y descuento de stock.
- **Gestionar el estado de las facturas**: pendiente, en envío, pagada o cancelada.
- **Verificar entregas con QR** en las facturas con envío a domicilio.
- **Persistir los datos** en archivos JSON locales.
- **Autenticación**: registro e inicio de sesión con usuario y contraseña.
- **Validar contraseñas**: se exige una contraseña suficientemente fuerte según zxcvbn.
- **Roles**: visitante (`guest`), cliente, empleado y administrador, con permisos distintos sobre productos, facturas y usuarios.
- **Administrar usuarios**: solo el administrador cambia roles y consulta la actividad de cada cuenta.
- **Panel de contabilidad**: métricas de facturación, cobros, ventas por mes, productos y clientes principales.

## ✅ Requisitos

- **Python 3.10+** (el proyecto se ejecuta con Python 3.14 en Windows).
- **Node.js `^20.19.0 || >=22.12.0`** y **npm** (requisito de Vite 8).
- **Navegador web moderno** (Chrome, Firefox, Edge, etc.).

> En Windows, si `python` abre el stub de Microsoft Store, usa `py` para invocar Python.

## 📚 Dependencias

### Backend

- **Flask** — framework web y servidor de la API.
- **Flask-CORS** — habilitación de CORS.
- **zxcvbn** — evalúa la fortaleza de las contraseñas antes de registrar un usuario.

No hay `requirements.txt`: las dependencias se instalan manualmente.

### Frontend

Se instalan con `npm install` dentro de `frontend/`:

- **React 19** y **React DOM**.
- **Vite 8** con `@vitejs/plugin-react` y `@tanstack/router-plugin`.
- **Tailwind CSS v4**, `@tailwindcss/vite` y `tw-animate-css`.
- **Radix UI** (`dialog`, `label`, `slot`, `tabs`).
- **TanStack Router** para las rutas de la SPA.
- **lucide-react** (iconos), **sonner** (notificaciones) y **@fontsource-variable/inter** (tipografía).
- **@zxcvbn-ts/core** y **@zxcvbn-ts/language-common** — medidor de fuerza de contraseña en el registro.
- **class-variance-authority**, **clsx** y **tailwind-merge** (utilidades de estilos).
- **oxlint** (lint, solo desarrollo).

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/mbrianp05/store-admin
cd store-admin
```

### 2. Crear y activar un entorno virtual

#### En Windows

```bash
py -m venv venv
venv\Scripts\activate
```

#### En macOS/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias del backend

```bash
py -m pip install flask flask-cors zxcvbn
```

En macOS/Linux usa `python3 -m pip install flask flask-cors zxcvbn`.

### 4. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 5. Verificar la instalación

```bash
py -m pip list
```

Deberías ver `flask` y `flask-cors` en la lista. En `frontend/`, `npm install` genera `node_modules/` y `package-lock.json`.

## ▶️ Ejecutar la aplicación

### Desarrollo (dos terminales)

**Terminal 1 — backend Flask:**

```bash
py app.py
```

Queda disponible en `http://localhost:5000` con el modo debug activado.

**Terminal 2 — frontend Vite:**

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173`. Vite redirige `/api` y `/uploads` al backend en el puerto 5000 (ver `frontend/vite.config.js`).

### Modo producción local (un solo servidor)

```bash
cd frontend
npm run build
cd ..
py app.py
```

Abre `http://localhost:5000`. Flask sirve `frontend/dist` en `/` y la API en `/api/*`. Si `frontend/dist` no existe, `GET /` devuelve un error **503** con el mensaje «Frontend no compilado».

## 🖥️ Uso de la interfaz

El encabezado fijo muestra la marca **Venture** y la fecha del día. Las pestañas **Productos** y **Facturas** muestran la cantidad de cada una; los administradores ven además **Contabilidad** y **Usuarios**.

- En escritorio, el carrito aparece como panel fijo a la derecha.
- En pantallas pequeñas, cuando hay artículos, una barra inferior muestra el total del carrito y abre el panel deslizante.
- Las acciones muestran notificaciones (toasts) en la esquina inferior derecha.
- Un visitante sin sesión puede consultar el catálogo y las fichas de producto; para comprar o facturar debe iniciar sesión.

### 🔐 Autenticación

- **Registro**: nombres, apellidos, usuario, residencia y contraseña; el correo electrónico es opcional.
- **Primera cuenta**: si todavía no hay usuarios, la primera persona que se registre obtiene el rol `admin`. La pantalla de acceso lo avisa con un banner («La primera cuenta será la administradora»).
- **Residencia**: debe ser un municipio de Cuba, elegido desde un campo con autocompletado.
- **Contraseña**: mínimo 8 caracteres y fortaleza «Aceptable» o superior según zxcvbn.
- **Inicio de sesión**: con usuario y contraseña; la sesión se guarda en una cookie firmada.
- **Acceso**: sin sesión, las rutas privadas redirigen a `/login` y la API responde `401`.
- **Cerrar sesión**: botón en el encabezado.
- **Límite de intentos**: 5 fallos por usuario e IP y 10 por IP cada 15 minutos; al superarlos la API responde `429` con `Retry-After`.

### 🧑‍🤝‍🧑 Roles y permisos

| Rol | Puede comprar y facturar | Gestiona productos | Cambia estados de facturas | Ve todas las facturas | Administra usuarios, contabilidad y configuración |
| --- | --- | --- | --- | --- | --- |
| `guest` (sin sesión) | No | No | No | No | No |
| `cliente` | Sí | No | No | Solo las propias | No |
| `empleado` | Sí | Sí | Sí | Sí | No |
| `admin` | Sí | Sí | Sí | Sí | Sí |

- El rol `guest` no se guarda: describe a cualquier visitante sin sesión.
- Las cuentas nuevas se crean como `cliente`, salvo la primera, que es `admin`.
- Un `empleado` o `admin` puede emitir facturas y también gestionar el negocio; no son roles excluyentes.
- Solo un `admin` puede asignar roles desde **Usuarios** y abrir **Contabilidad**.
- El backend aplica los permisos con `403`; la interfaz oculta las acciones que el rol no permite.
- No se puede quitar el rol al último administrador: la API responde `409`.

### 📦 Productos

- **Listar**: tarjetas con portada, nombre, descripción, precio por unidad y cantidad en el carrito.
- **Filtrar**: por categoría, además de la búsqueda por nombre y descripción.
- **Agregar**: botón «Agregar producto» que abre el formulario en la misma vista.
- **Editar**: botón de lápiz en cada tarjeta o desde la ficha del producto.
- **Eliminar**: botón de papelera con confirmación en la propia tarjeta.
- **Buscar**: filtra por nombre y descripción mientras escribes e indica la cantidad de resultados.
- **Datos del producto**: nombre, precio, unidad de medida (`unidad`, `metro`, `par`, etc.), stock, categoría, descripción opcional y descuento.
- **Fotos**: hasta 8 por producto, de 10 MB como máximo cada una. Formatos admitidos: JPG, JPEG, PNG, WEBP, GIF y AVIF. La primera foto se usa como portada.
- **Agregar al carrito**: valida el stock disponible y avisa si no se puede sumar más cantidad.
- **Permisos**: los botones de agregar, editar y eliminar producto solo aparecen para `empleado` y `admin`; un `cliente` puede consultar el catálogo y comprar.

### 🛒 Carrito

- **Ver carrito**: lista de productos con precio unitario, cantidad, subtotal y total.
- **Modificar cantidades**: botones `+` y `−`; si se llega al stock disponible, se muestra un aviso.
- **Quitar artículos**: botón `×`.
- **Elegir entrega**: retiro en el local o envío a domicilio con dirección y costo fijo.
- **Emitir factura**: envía los artículos al backend, descuenta el stock, agrega la factura al historial y limpia el carrito.

### 🧾 Facturas

- **Listar**: historial ordenado de la más reciente a la más antigua. Un `cliente` ve solo sus facturas; `empleado` y `admin` ven las de todas las cuentas, con el usuario emisor indicado.
- **Filtrar**: por producto, periodo, estado y subtotal mínimo.
- **Ver detalle**: número, fecha, estado, artículos, precio unitario, subtotal, envío y total.
- **Cambiar estado**: pendiente, en envío, pagada o cancelada; solo `empleado` y `admin` pueden hacerlo. La cancelación admite un motivo opcional.
- **QR de entrega**: las facturas con envío a domicilio incluyen un código QR; al cancelar la factura, el QR se muestra anulado.
- **Navegación responsive**: en pantallas pequeñas, el detalle incluye un botón para volver al listado.

### 🧑‍💼 Usuarios (solo administración)

- **Listar**: todas las cuentas con rol, residencia, correo, fecha de registro y cantidad de facturas.
- **Filtrar**: por nombre, usuario o correo.
- **Cambiar rol**: cliente, empleado o administrador; el cambio se aplica de inmediato.
- **Protección**: la cuenta fundadora se marca como tal y no se puede dejar el sistema sin administradores.

### 📊 Contabilidad (solo administración)

- **Resumen**: total facturado, cobrado y pendiente, porcentaje de cobro, ticket promedio y facturas por estado.
- **Gráficos**: evolución mensual de la facturación, distribución por estado, productos más vendidos y clientes con mayor importe.
- **Detalle**: últimas facturas y tablas de productos y clientes principales.
- **Alcance**: las facturas canceladas se excluyen de los totales y gráficos de ventas.

## 🗂️ Estructura del proyecto

```text
app.py                         # API Flask y servidor de frontend/dist
autenticacion.py               # Registro, contraseñas, roles y persistencia de usuarios
ubicaciones.py                 # Municipios de Cuba para el autocompletado
limitador.py                   # Rate limit en memoria para el login
models/
  __init__.py                  # Reexporta las clases del dominio
  Producto.py                  # Producto (nombre, precio, stock, fotos, descuento...)
  Inventario.py                # Inventario de productos
  Carrito.py                   # Carrito y cálculo de totales
  Factura.py                   # Factura, estados, envío y QR
  GestorFacturas.py            # Historial de facturas
frontend/
  index.html                   # HTML de la SPA
  package.json
  vite.config.js               # Plugins, alias @ y proxy a Flask
  jsconfig.json                # Alias @/* -> src/*
  components.json              # Configuración de componentes estilo shadcn
  .oxlintrc.json
  public/
    favicon.svg                # Marca de Venture
  src/
    main.jsx                   # Entry point de React
    App.jsx                    # Estado de vista, carrito, facturas y configuración
    api.js                     # Llamadas a la API (/api)
    auth-context.jsx           # Sesión, login, registro y logout
    app-context.js             # Contexto compartido de productos y facturas
    index.css                  # Tailwind, tokens de diseño y estilos base
    lib/
      format.js                # Formatos de moneda (CUP) y fecha
      fechas.js                # Utilidades de fechas y periodos
      pricing.js               # Descuentos y precio vigente
      password.js              # Evaluación local de contraseñas
      text.js                  # Normalización de texto para búsquedas
      roles.js                 # Roles, etiquetas y permisos del frontend
      utils.js                 # Utilidad cn() para clases
    components/
      AuthShell.jsx            # Marco visual de login y registro
      AppLoader.jsx            # Pantalla de carga de la sesión
      BrandMark.jsx            # Marca de Venture
      Masthead.jsx             # Encabezado, marca y pestañas
      ProductsView.jsx         # Listado, búsqueda y acciones de productos
      ProductForm.jsx          # Alta y edición con fotos y descuentos
      ProductGallery.jsx       # Galería de fotos del producto
      CategoryAutocomplete.jsx # Autocompletado de categorías
      DateRangePicker.jsx      # Selector de periodo para descuentos y filtros
      DiscountEditor.jsx       # Editor de descuentos por porcentaje
      CartPanel.jsx            # Carrito de escritorio y móvil
      InvoicesView.jsx         # Historial y detalle de facturas
      InvoiceQR.jsx            # Código QR de entrega
      AccountingCharts.jsx     # Gráficos SVG del panel de contabilidad
      SettingsDialog.jsx       # Configuración del costo de envío
      LocationAutocomplete.jsx # Autocompletado de municipios de Cuba
      PasswordStrength.jsx     # Medidor de fuerza de contraseña
      ui/                      # Componentes base (button, card, input, tabs, sheet...)
    pages/
      LoginPage.jsx
      RegisterPage.jsx
      ProductsPage.jsx
      ProductDetailPage.jsx
      InvoicesPage.jsx
      ProfilePage.jsx          # Perfil: usuario, residencia, correo y contraseña
      UsersPage.jsx            # Administración de cuentas y roles
      AccountingPage.jsx       # Panel de contabilidad
    routes/                    # Rutas de TanStack Router
      __root.jsx
      _app.jsx                 # Layout autenticado
      login.jsx
      registro.jsx
      _app/index.jsx
      _app/facturas.jsx
      _app/perfil.jsx
      _app/usuarios.jsx        # Solo administración
      _app/contabilidad.jsx    # Solo administración
      _app/productos/$nombre.jsx
AGENTS.md                      # Notas para agentes y desarrollo
README.md
```

`frontend/dist/` se genera con `npm run build` y también está ignorado por git.

## 🔌 API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registra un usuario y abre su sesión. La primera cuenta es `admin`. |
| `POST` | `/api/auth/login` | Inicia sesión con usuario y contraseña. |
| `POST` | `/api/auth/logout` | Cierra la sesión. |
| `GET` | `/api/auth/me` | Devuelve el usuario de la sesión actual, incluido su rol. |
| `GET` | `/api/auth/estado` | Indica si existen cuentas y si la próxima registrada será `admin`. Público. |
| `PATCH` | `/api/auth/perfil` | Actualiza usuario, residencia y correo del usuario de la sesión. |
| `POST` | `/api/auth/password` | Cambia la contraseña (requiere la contraseña actual). |
| `GET` | `/api/auth/ubicaciones` | Lista los municipios de Cuba. |
| `GET` | `/api/admin/usuarios` | Lista las cuentas con su rol y cantidad de facturas. Solo `admin`. |
| `PATCH` | `/api/admin/usuarios/<nombre>/rol` | Cambia el rol de una cuenta. Solo `admin`. |
| `GET` | `/api/products` | Lista todos los productos. Público. |
| `POST` | `/api/products` | Crea un producto. `empleado` o `admin`. |
| `PUT` | `/api/products/<nombre>` | Actualiza un producto por su nombre actual. `empleado` o `admin`. |
| `DELETE` | `/api/products/<nombre>` | Elimina un producto. `empleado` o `admin`. |
| `POST` | `/api/uploads` | Sube una foto (`multipart/form-data`, campo `foto`). `empleado` o `admin`. |
| `GET` | `/api/config` | Devuelve la configuración actual (`costo_envio`). |
| `PUT` | `/api/config` | Actualiza el costo fijo de envío. Solo `admin`. |
| `GET` | `/api/contabilidad` | Devuelve las métricas y series del panel de contabilidad. Solo `admin`. |
| `GET` | `/api/invoices` | Lista las facturas del usuario; `empleado` y `admin` ven todas. |
| `POST` | `/api/invoices` | Emite una factura y descuenta stock. Cualquier cuenta con sesión. |
| `PATCH` | `/api/invoices/<numero>` | Cambia el estado de una factura. `empleado` o `admin`. |
| `GET` | `/uploads/<archivo>` | Sirve una foto subida. Público. |
| `GET` | `/` | Sirve `frontend/dist/index.html` (503 si no está compilado). |

> Salvo las rutas de `/api/auth`, `GET /api/products` y `/uploads/*`, todos los endpoints requieren una sesión activa y responden `401` si no la hay. Cuando la sesión existe pero el rol no alcanza, responden `403`.

### GET /api/auth/estado

```json
{
  "hay_usuarios": false,
  "total_usuarios": 0,
  "primer_usuario_admin": true
}
```

- `primer_usuario_admin` es `true` mientras no exista ninguna cuenta; la próxima registrada será `admin`.
- Es público y lo usan las pantallas de acceso y registro para mostrar el banner de primera cuenta.

### GET /api/admin/usuarios

Requiere rol `admin`. Devuelve la lista de cuentas con su rol, datos públicos, `fundador` (la primera cuenta) y `facturas` (cantidad emitida):

```json
[
  {
    "usuario": "maria.perez",
    "nombres": "María",
    "apellidos": "Pérez",
    "residencia": "Centro Habana, La Habana",
    "email": "maria@ejemplo.cu",
    "creado": "2026-11-14T16:51:16+00:00",
    "rol": "admin",
    "fundador": true,
    "facturas": 3
  }
]
```

### PATCH /api/admin/usuarios/<nombre>/rol

```json
{ "rol": "empleado" }
```

- `rol` debe ser `cliente`, `empleado` o `admin`; cualquier otro valor responde **400**.
- Responde **404** si el usuario no existe.
- No se puede degradar al último `admin`: responde **409**.
- Solo un `admin` puede cambiar roles.

### GET /api/contabilidad

Requiere rol `admin`. Agrega las facturas del negocio y devuelve:

- `resumen`: `total_facturado`, `total_cobrado`, `total_pendiente`, `porcentaje_cobrado`, `ticket_promedio`, `facturas_total`, `facturas_validas`, `facturas_canceladas`, `facturas_pendientes`, `clientes` y `productos_vendidos`.
- `por_estado`: cantidad e importe por cada estado de factura.
- `por_mes`: total y cantidad de facturas de los últimos 8 meses (`clave` y `etiqueta`).
- `top_productos` y `top_clientes`: los cinco primeros por importe.
- `ultimas_facturas`: las seis más recientes.
- `generado`: marca temporal ISO de la respuesta.

Las facturas canceladas no suman a los totales ni a las series de ventas.

### POST /api/products

```json
{
  "nombre": "Collar de perlas",
  "precio": 10.0,
  "unidad_medida": "unidad",
  "descripcion": "Collar de 45 cm",
  "stock": 12,
  "categoria": "Accesorios",
  "descuento": {
    "porcentaje": 15,
    "desde": "2026-11-01",
    "hasta": "2026-11-30"
  },
  "fotos": ["/uploads/abc123.jpg"]
}
```

- `nombre` es obligatorio y no puede repetirse (comparación sin distinguir mayúsculas).
- `precio` debe ser numérico y mayor a cero.
- `stock` debe ser un entero mayor o igual a cero; si se omite, vale `0`.
- `unidad_medida` es texto libre; si se omite o está vacío, vale `"unidad"`.
- `categoria` es texto libre de hasta 60 caracteres; puede ir vacía.
- `descuento` es opcional: el porcentaje debe estar entre 0 y 100 y ambas fechas deben ser ISO (`YYYY-MM-DD`), con `desde` anterior o igual a `hasta`.
- Se acepta `fotos` como array o el campo heredado `foto` como string.
- Devuelve **400** si los datos son inválidos y **409** si el nombre ya existe.

### PUT /api/products/<nombre>

Acepta los mismos campos y permite cambiar el nombre. Responde **404** si el producto no existe, **400** si los datos son inválidos y **409** si el nuevo nombre choca con otro producto.

### DELETE /api/products/<nombre>

Elimina el producto y responde `{ "success": true }`. Si no existe, responde **404**.

### POST /api/uploads

Envía el archivo como `multipart/form-data` con el campo `foto`. Valida la extensión y el tipo MIME de la imagen, y devuelve:

```json
{ "url": "/uploads/abc123.jpg" }
```

Responde **400** si el archivo no es una imagen admitida y **413** si supera los 10 MB.

### GET /api/config

```json
{ "costo_envio": 150.0 }
```

### PUT /api/config

```json
{ "costo_envio": 150.0 }
```

- `costo_envio` debe ser un número mayor o igual a cero y no superar `1 000 000`.
- El costo se aplica a las facturas nuevas con envío a domicilio.
- Solo un `admin` puede actualizar la configuración; cualquier otra cuenta recibe **403**.
- Responde **400** si el valor no es válido.

### GET /api/invoices

Devuelve las facturas de la más antigua a la más reciente. Un `cliente` recibe solo las propias; `empleado` y `admin` reciben las de todas las cuentas. Cada factura incluye los datos completos del producto y el estado de la entrega:

```json
[
  {
    "numero": 1,
    "fecha": "2026-11-13",
    "items": [
      {
        "producto": {
          "nombre": "Collar de perlas",
          "precio": 10.0,
          "unidad_medida": "unidad",
          "descripcion": "Collar de 45 cm",
          "categoria": "Accesorios",
          "fotos": ["/uploads/abc123.jpg"],
          "stock": 10,
          "descuento": null
        },
        "cantidad": 2
      }
    ],
    "subtotal": 20.0,
    "costo_envio": 0,
    "total": 20.0,
    "estado": "pendiente",
    "envio": {
      "a_domicilio": false,
      "ubicacion": "",
      "direccion": ""
    },
    "usuario": "maria.perez",
    "codigo": "A1B2C3D4",
    "qr": "",
    "motivo_cancelacion": ""
  }
]
```

- `items` es un array de objetos con `producto` y `cantidad`.
- `producto` contiene el estado del producto en el momento de la consulta, no una copia histórica.
- `subtotal` es la suma de los precios vigentes al momento de emitir; `total` incluye `costo_envio`.
- `estado` puede ser `pendiente`, `en_envio`, `pagada` o `cancelada`.
- `qr` solo tiene contenido cuando la factura es con envío a domicilio.
- El frontend ordena las facturas de la más reciente a la más antigua para mostrarlas.

### POST /api/invoices

```json
{
  "items": [
    {
      "producto": { "nombre": "Collar de perlas" },
      "cantidad": 2
    }
  ],
  "envio": {
    "a_domicilio": true,
    "direccion": "Calle 10 #123, Vedado"
  }
}
```

- `items` debe ser un array no vacío.
- Del producto solo se usa `nombre`: el precio y el stock se toman del inventario actual.
- Cada producto debe existir en el inventario.
- Las cantidades deben ser enteras y mayores a cero.
- Si un producto aparece repetido, las cantidades se agrupan.
- Se valida el stock antes de emitir; si no alcanza, responde **409** con la cantidad disponible.
- `envio` es opcional. Si `a_domicilio` es `true`, `direccion` es obligatoria; en ese caso se suma el costo fijo de envío configurado.
- El **número de factura lo asigna el servidor** por usuario (`next_invoice_number`), no el cliente.
- La factura nace en estado `pendiente`.
- Al emitir, descuenta el stock, guarda los cambios y devuelve la factura creada.

### PATCH /api/invoices/<numero>

```json
{
  "estado": "cancelada",
  "motivo_cancelacion": "El cliente no retiró el pedido"
}
```

- `estado` debe ser uno de `pendiente`, `en_envio`, `pagada` o `cancelada`.
- `motivo_cancelacion` es opcional y solo se conserva cuando el estado es `cancelada`.
- Solo `empleado` y `admin` pueden cambiar estados; un `cliente` recibe **403**.
- El número de factura es por usuario y puede repetirse entre cuentas. Para desambiguar, envía también `usuario` en el cuerpo; si hay varias coincidencias y no se indica, responde **409**.
- Si no existe una factura que coincida, responde **404**.
- La cancelación no repone el stock automáticamente.

## 🧪 Scripts y calidad

Dentro de `frontend/`:

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Genera frontend/dist
npm run preview   # Previsualiza el build de Vite
npm run lint      # Ejecuta oxlint
```

No hay linter de backend, suite de tests ni CI configurado.

## 🧯 Solución de problemas

### Error 503: «Frontend no compilado»

Flask no encontró `frontend/dist/index.html`. Compila el frontend:

```bash
cd frontend
npm run build
```

### La página de Vite carga pero no hay datos

Verifica que el backend esté corriendo en el puerto 5000. El proxy de Vite está definido en `frontend/vite.config.js`; si cambias el puerto de Flask, actualízalo también allí.

### Error: «ModuleNotFoundError: No module named 'flask'»

Instala las dependencias del backend:

```bash
py -m pip install flask flask-cors zxcvbn
```

### Error: «Address already in use»

El puerto 5000 está ocupado. Cierra el proceso que lo usa o cambia el puerto en `app.py`:

```python
app.run(debug=True, port=5500)
```

Si lo cambias, actualiza el proxy de Vite.

### Error 409 al emitir una factura

No hay stock suficiente o el producto ya no existe en el inventario. Recarga la vista, revisa el stock del producto y ajusta las cantidades.

### Una foto no se sube

Revisa que sea JPG, JPEG, PNG, WEBP, GIF o AVIF, que no supere los 10 MB y que no se hayan alcanzado las 8 fotos del producto.

### Los productos de ejemplo no se pueden facturar

Se crean con stock 0. Edita cada producto y asígnale stock antes de agregarlo al carrito.

### Error 404 al eliminar un producto

Puede haber cambiado de nombre o haberse eliminado en otra pestaña. Recarga la lista antes de reintentar.

## 📝 Notas adicionales

- No hay base de datos: los usuarios, el inventario, las facturas y la configuración viven en archivos JSON, y la sesión en una cookie firmada.
- Cada cuenta guarda un `rol` (`cliente`, `empleado` o `admin`). `guest` es solo el visitante sin sesión y no se persiste.
- La primera cuenta registrada en un archivo de usuarios vacío se crea como `admin`; las siguientes, como `cliente`.
- Si un archivo de usuarios antiguo no tiene roles, la primera cuenta del JSON se normaliza como `admin` y el resto como `cliente`.
- El backend valida los permisos en cada petición; la interfaz solo oculta las acciones no permitidas.
- La contabilidad y la administración de usuarios son exclusivas del rol `admin`.
- El número de factura lo controla el servidor y se restaura desde la factura de mayor número de cada usuario al iniciar.
- El stock se descuenta en el backend al emitir la factura; el frontend actualiza su copia de forma optimista.
- El carrito es estado del cliente y se vacía después de emitir una factura.
- La moneda se muestra en pesos cubanos (CUP) y las fechas en formato estándar de español (`es-ES`).
- La API del frontend usa rutas relativas (`/api`) y los nombres de campos están en español: `nombre`, `precio`, `unidad_medida`, `cantidad`, `stock`, `categoria`, `descuento`, `fotos`, `envio`.
- El modelo `Carrito` mantiene el método `addChart` con esa ortografía.
- Tailwind v4 toma los colores y la tipografía del bloque `@theme` de `frontend/src/index.css`; no hay `tailwind.config.js`.
- Para el detalle completo de comandos y convenciones, consulta `AGENTS.md`.
- Las contraseñas se almacenan con hash `scrypt`.
- La sesión usa una cookie firmada con `SECRET_KEY`.
- En producción sobre HTTPS, define `SESSION_COOKIE_SECURE=1` para que la cookie solo viaje por conexiones seguras.
- La residencia se valida contra la lista de municipios de Cuba de `ubicaciones.py`.
- El rate limit del login vive en memoria (`limitador.py`); si se reinicia el servidor se reinician los contadores.

## 🚀 Ejemplo de uso

1. **Agregar un producto**
   - Entra a **Productos**.
   - Haz clic en **Agregar producto**.
   - Completa nombre, precio, unidad, stock, categoría, descripción, descuento y fotos.
   - Haz clic en **Guardar producto**.

2. **Armar el carrito y facturar**
   - Busca el producto en el listado.
   - Haz clic en **Agregar**.
   - Ajusta la cantidad con `+` y `−` desde el panel del carrito.
   - Elige **Retiro** o **A domicilio**, completa la dirección si corresponde y confirma.
   - Haz clic en **Emitir factura**.

3. **Consultar facturas**
   - Entra a la pestaña **Facturas**.
   - Selecciona una factura de la lista para ver sus artículos, subtotales y total.
   - Cambia su estado o cancélala desde el detalle.

---

Hecho para acompañar el día a día de un pequeño comercio.
