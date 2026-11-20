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
- **Persistir los datos** en PostgreSQL con un esquema normalizado.
- **Autenticación**: registro e inicio de sesión con usuario y contraseña.
- **Validar contraseñas**: se exige una contraseña suficientemente fuerte según zxcvbn.
- **Roles**: visitante (`guest`), cliente, empleado y administrador, con permisos distintos sobre productos, facturas y usuarios.
- **Administrar usuarios**: solo el administrador cambia roles y consulta la actividad de cada cuenta.
- **Panel de contabilidad**: métricas de facturación, cobros, ventas por mes, productos y clientes principales.
- **Agrupar envíos**: empleados y administradores reúnen facturas a domicilio en un envío único y las pasan a estado «En envío».

## ✅ Requisitos

- **Python 3.10+** (el proyecto se ejecuta con Python 3.14 en Windows).
- **PostgreSQL 14+** en ejecución (probado con PostgreSQL 16).
- **Node.js `^20.19.0 || >=22.12.0`** y **npm** (requisito de Vite 8).
- **Navegador web moderno** (Chrome, Firefox, Edge, etc.).

> En Windows, si `python` abre el stub de Microsoft Store, usa `py` para invocar Python.

## 📚 Dependencias

### Backend

Se instalan con `requirements.txt`:

- **Flask** — framework web y servidor de la API.
- **Flask-CORS** — habilitación de CORS.
- **zxcvbn** — evalúa la fortaleza de las contraseñas antes de registrar un usuario.
- **SQLAlchemy 2** (extra `asyncio`) — ORM y capa de acceso a datos.
- **asyncpg** — driver asíncrono de PostgreSQL.
- **greenlet** — requerido por SQLAlchemy para su modo asíncrono (se instala con SQLAlchemy).

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
git clone https://github.com/mbrianp05/venture
cd venture
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
py -m pip install -r requirements.txt
```

En macOS/Linux usa `python3 -m pip install -r requirements.txt`.

### 4. Crear la base de datos PostgreSQL

Con el servidor de PostgreSQL en ejecución, crea la base una sola vez:

```bash
createdb -U postgres venture
```

Configura la conexión en un archivo `.env` en la raíz del proyecto. Cópialo desde el ejemplo:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Edita `DATABASE_URL` con tu usuario y contraseña:

```env
DATABASE_URL=postgresql+asyncpg://postgres:TU_CLAVE@localhost:5432/venture
```

`database.py` carga `.env` automáticamente al arrancar. Si una variable ya está definida en el entorno real, esa tiene prioridad. Si `DATABASE_URL` no se define en ningún lado, se usa `postgresql+asyncpg://postgres:postgres@localhost:5432/venture`. Las tablas se crean automáticamente al iniciar la aplicación.

Para importar los datos históricos de `data/*.json` (solo con la base vacía):

```bash
py migrar_json.py
```

Usa `py migrar_json.py --forzar` para vaciar las tablas y volver a importar. Ejecútalo antes de iniciar la aplicación en una base nueva; si no, el arranque siembra cuatro productos de ejemplo y el importador pedirá `--forzar`.

### 5. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 6. Verificar la instalación

```bash
py -m pip list
```

Deberías ver `flask`, `flask-cors`, `sqlalchemy`, `asyncpg` y `greenlet` en la lista. En `frontend/`, `npm install` genera `node_modules/` y `package-lock.json`.

## ▶️ Ejecutar la aplicación

### Desarrollo (dos terminales)

**Terminal 1 — backend Flask:**

```bash
py app.py
```

Queda disponible en `http://localhost:5000` con el modo debug activado. Antes de iniciarlo, define `DATABASE_URL` en esa terminal y asegúrate de que PostgreSQL esté en ejecución. Si la conexión falla, el arranque se detiene con un error claro.

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

- **Registro**: nombres, apellidos, usuario, correo electrónico (opcional) y contraseña.
- **Primera cuenta**: si todavía no hay usuarios, la primera persona que se registre obtiene el rol `admin`. La pantalla de acceso lo avisa con un banner («La primera cuenta será la administradora»).
- **Contraseña**: mínimo 8 caracteres y fortaleza «Aceptable» o superior según zxcvbn.
- **Inicio de sesión**: con usuario y contraseña; la sesión se guarda en una cookie firmada.
- **Acceso**: sin sesión, las rutas privadas redirigen a `/login` y la API responde `401`.
- **Cerrar sesión**: botón en el encabezado.
- **Límite de intentos**: 5 fallos por usuario e IP y 10 por IP cada 15 minutos; al superarlos la API responde `429` con `Retry-After`.

### 🧑‍🤝‍🧑 Roles y permisos

| Rol | Puede comprar y facturar | Gestiona productos | Cambia estados de facturas | Ve todas las facturas | Gestiona envíos | Ajusta la tasa de envío | Administra usuarios y contabilidad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `guest` (sin sesión) | No | No | No | No | No | No | No |
| `cliente` | Sí | No | No | Solo las propias | No | No | No |
| `empleado` | Sí | Sí | Sí | Sí | Sí | No | No |
| `admin` | Sí | Sí | Sí | Sí | Sí | Sí | Sí |

- El rol `guest` no se guarda: describe a cualquier visitante sin sesión.
- Las cuentas nuevas se crean como `cliente`, salvo la primera, que es `admin`.
- Un `empleado` o `admin` puede emitir facturas y también gestionar el negocio; no son roles excluyentes.
- Solo un `admin` puede asignar roles desde **Usuarios** y abrir **Contabilidad**.
- La tasa de envío solo la ajusta un `admin` desde la página **Envíos**.
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
- **Orden**: se usa la fecha de emisión y, dentro del mismo día, el orden real de creación; la numeración se reinicia por usuario, así que no define el orden global.
- **Alternar alcance**: empleados y administradores pueden cambiar entre «Todas» y «Mías», porque también pueden comprar.
- **Filtrar**: por producto, periodo, estado y subtotal mínimo.
- **Paginación**: el historial muestra 9 facturas por página en una cuadrícula de 3×3, sin tabla; los controles están en la parte superior.
- **Ver detalle**: número, fecha, estado, artículos, precio unitario, subtotal, envío y total.
- **Abrir desde un envío**: las facturas listadas en **Envíos** son enlaces que abren su detalle aquí.
- **Cambiar estado**: pendiente, en envío, pagada o cancelada; solo `empleado` y `admin` pueden hacerlo. La cancelación admite un motivo opcional.
- **Estado visible para el cliente**: un `cliente` ve el estado actual de cada factura en modo solo lectura, sin poder modificarlo.
- **Envío a domicilio**: la opción «En envío» solo aparece en facturas con entrega a domicilio; el backend responde **400** si se intenta aplicar a una factura de retiro.
- **Stock**: cancelar una factura devuelve sus productos al inventario; reactivarla vuelve a descontarlos (responde **409** si ya no alcanza el stock).
- **QR de entrega**: las facturas con envío a domicilio incluyen un código QR; al cancelar la factura, el QR se muestra anulado.
- **Navegación responsive**: en pantallas pequeñas, el detalle incluye un botón para volver al listado.

### 🚚 Envíos (empleados y administración)

- **Facturas disponibles**: lista solo las facturas a domicilio pendientes que aún no pertenecen a un envío.
- **Agrupar**: selecciona varias facturas y crea un envío único; todas pasan a estado `en_envio`.
- **Seguimiento**: cada envío muestra código, fecha, creador, facturas, destinos y total.
- **Abrir facturas**: cada factura del envío enlaza a su detalle en **Facturas**, donde se consulta y cambia su estado.
- **Cancelar**: «Cancelar envío» devuelve las facturas a `pendiente`.
- **Estados del envío**: se derivan de sus facturas. Es «Completada» cuando todas están pagadas o canceladas, y «En progreso» mientras quede alguna sin cobrar; un envío cancelado mantiene «Cancelado».
- **Paginación**: facturas disponibles y envíos se paginan de 8 en 8 con los controles arriba.
- **Tasa de envío**: solo un `admin` puede editarla desde esta página; se aplica a las facturas nuevas con entrega a domicilio.

### 🧑‍💼 Usuarios (solo administración)

- **Listar**: todas las cuentas con rol, correo, fecha de registro y cantidad de facturas.
- **Paginación**: 8 cuentas por página con los controles en la parte superior.
- **Filtrar**: por nombre, usuario o correo.
- **Cambiar rol**: cliente, empleado o administrador; el cambio se aplica de inmediato.
- **Protección**: la cuenta fundadora se marca como tal y no se puede dejar el sistema sin administradores.

### 📊 Contabilidad (solo administración)

- **Resumen**: total facturado, cobrado y pendiente, porcentaje de cobro, ticket promedio y facturas por estado.
- **Gráficos**: evolución mensual de la facturación, distribución por estado, productos que más dinero dejaron y clientes con mayor importe, con Recharts.
- **Detalle**: últimas facturas y tablas de productos y clientes principales.
- **Productos**: ranking de los 8 productos con más ingresos, con unidades y porcentaje de participación.
- **Alcance**: las facturas canceladas se excluyen de los totales y gráficos de ventas.

## 🗂️ Estructura del proyecto

```text
app.py                         # API Flask y servidor de frontend/dist
database.py                    # Motor async, bucle dedicado, sesiones e inicialización
servicios.py                   # Lógica asíncrona de negocio sobre PostgreSQL
autenticacion.py               # Contraseñas, roles y validación de campos
limitador.py                   # Rate limit en memoria para el login
migrar_json.py                 # Importador de los data/*.json históricos
requirements.txt               # Dependencias del backend
models/
  __init__.py                  # Reexporta los modelos y utilidades del dominio
  Usuario.py                   # Usuarios, roles y hash de contraseña
  Producto.py                  # Categorías, productos, fotos y descuentos
  Factura.py                   # Facturas e ítems, estados, envío y QR
  Envio.py                     # Envíos y su relación con facturas
  Configuracion.py             # Fila única de configuración (costo de envío)
  Carrito.py                   # Carrito y cálculo de totales (no persistido)
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
      Pagination.jsx           # Controles de paginación reutilizables
      AccountingCharts.jsx     # Gráficos Recharts del panel de contabilidad
      PasswordStrength.jsx     # Medidor de fuerza de contraseña
      ui/                      # Componentes base (button, card, input, tabs, sheet...)
    pages/
      LoginPage.jsx
      RegisterPage.jsx
      ProductsPage.jsx
      ProductDetailPage.jsx
      InvoicesPage.jsx
      ProfilePage.jsx          # Perfil: usuario, correo y contraseña
      UsersPage.jsx            # Administración de cuentas y roles
      AccountingPage.jsx       # Panel de contabilidad
      EnviosPage.jsx           # Agrupación de facturas a domicilio en envíos
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
      _app/envios.jsx          # Empleados y administración
      _app/productos/$nombre.jsx
AGENTS.md                      # Notas para agentes y desarrollo
README.md
```

`frontend/dist/` se genera con `npm run build` y también está ignorado por git.

## 🗃️ Base de datos

PostgreSQL normalizado y gestionado con SQLAlchemy 2 async:

- `usuarios` — cuentas y roles (`cliente`, `empleado`, `admin`).
- `categorias` — una fila por categoría; `productos.categoria_id` es FK opcional.
- `productos` — precio, unidad, descripción, stock y aviso de reposición.
- `producto_fotos` — una fila por foto, ordenada; la primera es la portada.
- `producto_descuentos` — descuento uno a uno por producto (`porcentaje`, `desde`, `hasta`).
- `facturas` — cabecera con `numero` por usuario, `codigo` público, entrega, totales y estado.
- `factura_items` — líneas con `producto_id` opcional y copia histórica de nombre, unidad y precio.
- `envios` — cabecera del envío y su creador.
- `envio_facturas` — relación envío ↔ factura con `orden`; una factura pertenece a un solo envío.
- `configuracion` — fila única (`id = 1`) con `costo_envio`.

El dinero usa `Numeric(12, 2)` y la unicidad sin distinguir mayúsculas se respalda con índices únicos sobre `lower(...)`. Las fotos siguen guardándose en `data/uploads/`; la base solo almacena sus URLs.

## 🔌 API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registra un usuario y abre su sesión. La primera cuenta es `admin`. |
| `POST` | `/api/auth/login` | Inicia sesión con usuario y contraseña. |
| `POST` | `/api/auth/logout` | Cierra la sesión. |
| `GET` | `/api/auth/me` | Devuelve el usuario de la sesión actual, incluido su rol. |
| `GET` | `/api/auth/estado` | Indica si existen cuentas y si la próxima registrada será `admin`. Público. |
| `PATCH` | `/api/auth/perfil` | Actualiza usuario y correo del usuario de la sesión. |
| `POST` | `/api/auth/password` | Cambia la contraseña (requiere la contraseña actual). |
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
| `GET` | `/api/envios` | Lista los envíos y las facturas a domicilio disponibles. `empleado` o `admin`. |
| `POST` | `/api/envios` | Agrupa facturas a domicilio en un envío y las pasa a `en_envio`. `empleado` o `admin`. |
| `PATCH` | `/api/envios/<id>` | Marca un envío como `entregado` o `cancelado`. `empleado` o `admin`. |
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
- `top_productos` y `top_clientes`: los ocho productos y los clientes con mayor importe; cada producto incluye `cantidad` y `participacion` (% del total facturado).
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
- Solo un `admin` puede actualizar la configuración desde la página **Envíos**; un `empleado` o `cliente` recibe **403**.
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
- `producto` contiene el estado actual del producto; si el producto fue eliminado, se usan los datos históricos guardados en la línea (`factura_items`).
- `subtotal` es la suma de los precios aplicados al emitir; `total` incluye `costo_envio`.
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
- El **número de factura lo asigna el servidor** por usuario, dentro de la misma transacción que descuenta el stock.
- La factura nace en estado `pendiente`.
- Al emitir, descuenta el stock con bloqueo de fila, guarda los cambios en PostgreSQL y devuelve la factura creada.

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
- Cancelar repone el stock de los productos de la factura. Repetir la cancelación no lo duplica.
- Reactivar una factura cancelada vuelve a descontar el stock; si el producto ya no existe o no alcanza, responde **409** y no cambia el estado.
- Las facturas históricas cuyos productos ya no están en el inventario se cancelan igual, omitiendo el stock de esos productos.

### GET /api/envios

Requiere rol `empleado` o `admin`. Devuelve los envíos agrupados y las facturas a domicilio que aún pueden agruparse:

```json
{
  "envios": [
    {
      "id": "6f6a5c4c8d5e4d5f9a1b2c3d4e5f6a7b",
      "codigo": "ENV-A1B2C3",
      "fecha": "2026-11-14T15:30:00+00:00",
      "estado": "en_envio",
      "creado_por": "maria.perez",
      "notas": "Ruta de la tarde",
      "facturas": [
        {
          "codigo": "A1B2C3D4",
          "numero": 1,
          "fecha": "2026-11-14",
          "usuario": "maria.perez",
          "total": 25.0,
          "costo_envio": 5.0,
          "estado": "en_envio",
          "ubicacion": "Centro Habana, La Habana",
          "direccion": "Calle 10 #123"
        }
      ],
      "cantidad_facturas": 1,
      "destinos": ["Calle 10 #123, Centro Habana, La Habana"],
      "total": 25.0,
      "costo": 5.0
    }
  ],
  "facturas_disponibles": []
}
```

- `facturas_disponibles` contiene facturas con `envio.a_domicilio` en estado `pendiente` o `en_envio` que no pertenecen a ningún envío.
- Los envíos se devuelven del más reciente al más antiguo.

### POST /api/envios

```json
{
  "facturas": ["A1B2C3D4", "E5F6A7B8"],
  "notas": "Ruta de la tarde"
}
```

- Requiere rol `empleado` o `admin`.
- Cada elemento puede ser el `codigo` de la factura o un objeto `{ "codigo": "..." }`.
- Todas deben ser facturas a domicilio, no canceladas, no pagadas y no incluidas en otro envío.
- Al agrupar, todas pasan automáticamente a estado `en_envio` y el envío se guarda en PostgreSQL (tablas `envios` y `envio_facturas`).
- Responde **400** si la selección está vacía o contiene una factura no válida, **409** si alguna ya pertenece a otro envío o no se puede agrupar.

### PATCH /api/envios/<id>

```json
{ "estado": "entregado" }
```

- Requiere rol `empleado` o `admin`.
- `entregado` pasa las facturas del envío a `pagada`.
- `cancelado` devuelve a `pendiente` las facturas que seguían en `en_envio`.
- Un envío cancelado ya no admite cambios (**409**).

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
py -m pip install -r requirements.txt
```

### No se puede conectar a PostgreSQL

El arranque se detiene con un `RuntimeError` si la base no responde. Comprueba que:

- El servicio de PostgreSQL esté en ejecución.
- La base `venture` exista (`createdb -U postgres venture`).
- `DATABASE_URL` tenga el usuario, la contraseña, el host, el puerto y el nombre correctos.
- El driver sea asíncrono: usa el prefijo `postgresql+asyncpg://` (también se acepta `postgresql://` y se normaliza).

### El importador dice que la base ya tiene datos

`migrar_json.py` solo importa sobre una base vacía. Si ya arrancaste la aplicación, se sembraron los productos de ejemplo; usa `py migrar_json.py --forzar` para vaciar las tablas y reimportar.

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

- Los usuarios, el inventario, las facturas, los envíos y la configuración viven en PostgreSQL; la sesión sigue en una cookie firmada.
- Cada cuenta guarda un `rol` (`cliente`, `empleado` o `admin`). `guest` es solo el visitante sin sesión y no se persiste.
- La primera cuenta registrada en una tabla `usuarios` vacía se crea como `admin`; las siguientes, como `cliente`.
- Los datos históricos de `data/*.json` se importan con `migrar_json.py`; el tiempo de ejecución ya no lee ni escribe esos archivos.
- El backend valida los permisos en cada petición; la interfaz solo oculta las acciones no permitidas.
- La contabilidad y la administración de usuarios son exclusivas del rol `admin`.
- El número de factura lo controla el servidor y se calcula dentro de la transacción de emisión, con la cuenta bloqueada.
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
