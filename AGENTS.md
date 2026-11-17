# AGENTS.md

Inventory, cart, and invoicing app: Flask JSON API + React/Tailwind frontend, backed by PostgreSQL through SQLAlchemy 2 async and `asyncpg`. UI text, comments, and most identifiers are in Spanish — keep new user-facing strings in Spanish.

## Run

- PostgreSQL 14+ must be running. Create the database once: `createdb -U postgres venture`.
- Configure the connection with `DATABASE_URL`, for example:
  - PowerShell: `$env:DATABASE_URL = "postgresql+asyncpg://postgres:TU_CLAVE@localhost:5432/venture"`
  - Bash: `export DATABASE_URL="postgresql+asyncpg://postgres:TU_CLAVE@localhost:5432/venture"`
  - Default when unset: `postgresql+asyncpg://postgres:postgres@localhost:5432/venture`.
- Install Python deps: `py -m pip install -r requirements.txt` (Flask, Flask-CORS, zxcvbn, SQLAlchemy async, asyncpg). `requirements.txt` exists now.
- Backend: `py app.py` → http://localhost:5000. On this Windows setup `python` is a Store stub; use `py` (Python 3.14).
- Frontend dev: `cd frontend && npm install && npm run dev` → http://localhost:5173. Vite proxies `/api` and `/uploads` to Flask on port 5000.
- Production-ish: `cd frontend && npm run build`, then `py app.py`. Flask serves `frontend/dist` at `/` and the API at `/api/*`.
- Migrate legacy JSON data: `py migrar_json.py` (only when the database is empty) or `py migrar_json.py --forzar` (truncates and reimports). Run it before starting the app on a fresh database, otherwise startup seeds the four sample products and the importer refuses to run without `--forzar`.
- Lint the frontend with `cd frontend && npm run lint` (oxlint). There is no backend linter, test suite, or CI.

## Layout

- `app.py` — Flask API and static server for `frontend/dist`. Views stay synchronous and call the async services through `database.ejecutar()`.
- `database.py` — async engine, `async_sessionmaker`, the dedicated event-loop thread, `sesion_bd()` and `inicializar_base()` (schema + config + sample products).
- `servicios.py` — all async business/data operations. Each function opens its own session; errors raise `ErrorServicio(mensaje, estado)` and are converted to JSON by Flask.
- `autenticacion.py` — password hashing/verification (scrypt via Werkzeug), zxcvbn strength checks, role normalization and field validation. No persistence.
- `limitador.py` — in-memory login rate limit (per process).
- `models/` — SQLAlchemy ORM models, re-exported from `models/__init__.py`:
  - `Usuario.py` — `usuarios` (unique `lower(usuario)`, role check, timestamps).
  - `Producto.py` — `categorias`, `productos`, `producto_fotos`, `producto_descuentos`.
  - `Factura.py` — `facturas`, `factura_items`, invoice states, shipping normalization, QR text.
  - `Envio.py` — `envios`, `envio_facturas` (shipment line references with order).
  - `Configuracion.py` — single-row `configuracion` (`id = 1`, `costo_envio`).
  - `Carrito.py` — plain domain helper used for cart totals; it is not a persisted model.
- `migrar_json.py` — one-off importer for the old `data/*.json` files.
- `frontend/` — Vite + React 19 + Tailwind CSS v4. Entrypoint `src/main.jsx`; `src/App.jsx` owns view/cart/invoice state.
- `frontend/src/components/` — UI pieces; `ProductsView`, `CartPanel`, `InvoicesView`, `ProductForm`, `Pagination`, auth pieces `AuthShell`, `PasswordStrength`, `AppLoader`; admin charts are `AccountingCharts` (Recharts).
- `frontend/src/pages/` — `LoginPage`, `RegisterPage`, `ProductsPage`, `InvoicesPage`, `UsersPage` (admin), `AccountingPage` (admin), `EnviosPage` (empleado/admin).
- `frontend/src/routes/` — file-based TanStack Router routes; `_app.jsx` is the authenticated layout and enforces admin-only and staff-only routes, `login.jsx` and `registro.jsx` are public, `_app/usuarios.jsx` and `_app/contabilidad.jsx` are admin-only, `_app/envios.jsx` is staff-only.
- `frontend/src/auth-context.jsx` — session state (`user`, `loading`, `login`, `register`, `logout`, `refreshUser`).
- `frontend/src/lib/roles.js` — role labels and permission helpers (`esAdmin`, `puedeGestionarProductos`, `puedeCambiarEstadoFactura`, …).
- `frontend/src/api.js` — all API calls (`/api` relative). `frontend/src/lib/format.js` — currency/date/unit formatting.
- `frontend/src/index.css` — Tailwind import, `@theme` design tokens, and base styles.
- `data/` — only legacy JSON plus `uploads/` and `secret_key`; runtime state lives in PostgreSQL. `data/*.json` is gitignored.

## Database schema

Normalized around independent entities and relationship tables:

- `usuarios` — accounts and roles (`cliente`, `empleado`, `admin`).
- `categorias` — one row per category; `productos.categoria_id` is a nullable FK. Unique case-insensitive name.
- `productos` — price, unit, description, stock, restock flag.
- `producto_fotos` — one row per photo, ordered; the first is the cover.
- `producto_descuentos` — one-to-one discount per product (`porcentaje`, `desde`, `hasta`).
- `facturas` — invoice header, per-user `numero`, public `codigo`, delivery data, totals, state. `usuario_id` is a nullable FK; `usuario_legado` keeps the original name only for imported invoices whose account no longer exists.
- `factura_items` — invoice lines with `producto_id` (nullable FK), historical `producto_nombre`, `unidad_medida`, `precio_unitario` and `cantidad`. The snapshot keeps invoices readable after a product is renamed or deleted.
- `envios` — shipment header and creator.
- `envio_facturas` — shipment ↔ invoice relation with `orden`; `factura_id` is unique so an invoice belongs to at most one shipment.
- `configuracion` — single row (`id = 1`) with `costo_envio`.

Money uses `Numeric(12, 2)` (Decimal in Python, float only in JSON responses). Case-insensitive uniqueness is enforced with unique indexes on `lower(...)`.

## API

`GET/POST /api/products`, `PUT/DELETE /api/products/<nombre>`, `POST /api/uploads`, `GET/PUT /api/config`, `GET/POST /api/invoices`, `PATCH /api/invoices/<numero>`, `GET/POST /api/envios`, `PATCH /api/envios/<id>`, `GET /api/contabilidad`, `GET /api/admin/usuarios`, `PATCH /api/admin/usuarios/<nombre>/rol`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/estado`, `PATCH /api/auth/perfil`, `POST /api/auth/password`.

## Gotchas

- Async bridge: Flask is WSGI. Do not call `asyncio.run()` in views; use `database.ejecutar(coroutine)` or add an async function to `servicios.py`. The engine is bound to one dedicated event-loop thread.
- `sesion_bd()` commits on success and rolls back on exceptions. Do not return ORM objects from it: serialize with `to_dict()` / `usuario_publico()` inside the session and return plain dicts.
- Lazy loading is async and fails outside the session. Models use `lazy="selectin"`/`joined` for relationships that are serialized; keep it that way and use `.with_for_update(of=Model)` when locking rows that have eager relationships.
- `inicializar_base()` runs at import time in `app.py`: it creates missing tables, ensures the `configuracion` row and, only when `productos` is empty, seeds four sample products. If PostgreSQL is unreachable the app fails fast with a clear `RuntimeError`.
- `data/*.json` is local legacy state (only `ejemplo_*.json` is tracked). The runtime no longer reads or writes it; only `migrar_json.py` does.
- Uploaded photos still live under `data/uploads/`; the database stores only their URLs.
- Auth: users live in `usuarios` with `scrypt` password hashes (never plaintext). Registration asks for nombres, apellidos, usuario, optional email, and a zxcvbn-strong password.
- Roles live on each user as `rol`: `cliente`, `empleado` or `admin`. `guest` is the unauthenticated visitor and is never stored. The first account in an empty table becomes `admin`; later accounts default to `cliente`.
- Permission guards use `@requiere_roles(...)` in `app.py` and return `403` for a session without the needed role: product writes, uploads, invoice state changes and `/api/envios` require `empleado`/`admin`, while `PUT /api/config`, `/api/admin/*` and `/api/contabilidad` require `admin`. Demoting the last admin returns `409`.
- `GET /api/invoices` returns all invoices for `empleado`/`admin` and only the caller's invoices for `cliente`. Invoice numbers restart per user, so `PATCH /api/invoices/<numero>` accepts an optional `usuario` and returns `409` when the number is ambiguous. The invoices UI lets staff switch between «Todas» y «Mías»; clients see the state read-only.
- Invoice numbers are assigned inside the same transaction as the stock decrement, with the user row locked (`SELECT … FOR UPDATE`) so multi-process deployments do not reuse a number. Unique `(usuario_id, numero)` backs this up.
- `PATCH /api/invoices/<numero>` rejects `en_envio` with `400` unless the invoice has `a_domicilio`; the invoice UI hides that option for pickup invoices.
- Cancelling an invoice restores its products' stock; cancelling again is idempotent. Reactivating a cancelled invoice deducts stock again and returns `409` if a product is missing or insufficient. Lines whose product was deleted (`producto_id IS NULL`) are skipped when restoring and block reactivation.
- Stock is decremented with row locks on `productos`; invoice creation, cancellation and reactivation run in one transaction. There is no global `threading.Lock` anymore.
- Shipments live in `envios`/`envio_facturas`. A shipment stores invoice references by `codigo` (stable across per-user renumbering) through the relation table. Grouping only accepts home-delivery invoices in `pendiente`/`en_envio` that are not already in another non-cancelled shipment; it sets them to `en_envio`. PATCH `entregado` sets them `pagada`, PATCH `cancelado` returns them to `pendiente`. The shipments UI only exposes cancel; invoice states are changed from Facturas.
- Shipment invoice links navigate to `/facturas?factura=<codigo>`; `InvoicesPage` selects the matching invoice and clears the query param.
- `GET /api/invoices` returns invoices oldest-first. Because `numero` restarts per user, the invoices UI sorts newest-first by `fecha` and, within the same day, by creation order (`ordenCreacion` in `InvoicesView`).
- Invoices show 9 per page in a 3×3 card grid; users, available shipment invoices and shipments paginate 8 per page, with controls at the top (`frontend/src/components/Pagination.jsx`).
- The shipment badge is derived from its invoices: `Completada` when every invoice is `pagada` or `cancelada`, otherwise `En progreso`; `cancelado` shipments stay `Cancelado`.
- Selecting an invoice in the invoices grid replaces the grid with the detail; the back button is always visible.
- `GET /api/auth/estado` is public and reports `hay_usuarios`, `total_usuarios` and `primer_usuario_admin`; login and registration use it to show the first-admin banner.
- Every `/api/*` and `/uploads/*` request except the `/api/auth` routes and `GET /api/products` requires the session cookie; the SPA redirects to `/login` when `GET /api/auth/me` returns 401.
- `SECRET_KEY` and `SESSION_COOKIE_SECURE` are read from the environment; without `SECRET_KEY`, a stable key is generated at `data/secret_key`. Set `SESSION_COOKIE_SECURE=1` behind HTTPS.
- Session state is a signed Flask cookie (`session['usuario']`), not a database table. Logout only clears that cookie. Renaming a user updates the cookie and invoices follow through `usuario_id`.
- Login rate limit lives in `limitador.py` and is per-process: 5 failures per IP+usuario and 10 per IP in 15 minutes, blocked for 15 minutes, then a successful login clears both counters. Configure with `LOGIN_MAX_INTENTOS`, `LOGIN_MAX_INTENTOS_IP`, `LOGIN_VENTANA_SEGUNDOS`, `LOGIN_BLOQUEO_SEGUNDOS`. It returns `429` with `Retry-After`.
- Frontend cart state is `{ producto, cantidad }` and JSON field names are Spanish (`nombre`, `precio`, `unidad_medida`, `cantidad`). Keep the React components and `app.py` in sync.
- `Carrito.addChart` is spelled that way (not `addToCart`).
- Tailwind v4: add colors/fonts in the `@theme` block in `frontend/src/index.css`; there is no `tailwind.config.js`.
- UI copy uses neutral Spanish (tuteo, not voseo). Branding is **Venture** and prices are formatted in CUP with `es-ES` locale.
- `README.md` is UTF-8. Older copies were UTF-16LE with a BOM; if you see a BOM, normalize the file to UTF-8.
