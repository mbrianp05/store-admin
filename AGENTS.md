# AGENTS.md

Inventory, cart, and invoicing app: Flask JSON API + React/Tailwind frontend. UI text, comments, and most identifiers are in Spanish — keep new user-facing strings in Spanish.

## Run

- Backend: `py app.py` → http://localhost:5000. On this Windows setup `python` is a Store stub; use `py` (Python 3.14).
- Frontend dev: `cd frontend && npm install && npm run dev` → http://localhost:5173. Vite proxies `/api` to the Flask server on port 5000.
- Production-ish: `cd frontend && npm run build`, then `py app.py`. Flask serves `frontend/dist` at `/` and the API at `/api/*`.
- Install Python deps manually: `py -m pip install flask flask-cors zxcvbn`. There is no `requirements.txt`.
- Lint the frontend with `cd frontend && npm run lint` (oxlint). There is no backend linter, test suite, or CI.

## Layout

- `app.py` — Flask API and static server for `frontend/dist`; the only backend entrypoint.
- `autenticacion.py` — registro, validación de contraseñas (zxcvbn) y persistencia de usuarios en `data/usuarios.json`.
- `ubicaciones.py` — municipios de Cuba usados por el autocompletado de residencia y la validación del backend.
- `limitador.py` — rate limit en memoria para el login (fallos por IP y por IP+usuario).
- `models/` — domain classes (`Producto`, `Inventario`, `Carrito`, `Factura`, `GestorFacturas`) re-exported from `models/__init__.py`. Use relative imports inside the package.
- `frontend/` — Vite + React 19 + Tailwind CSS v4. Entrypoint `src/main.jsx`; `src/App.jsx` owns view/cart/invoice state.
- `frontend/src/components/` — UI pieces; `ProductsView`, `CartPanel`, `InvoicesView`, `ProductForm`, `Sidebar`, `Toast`, `Icons`; auth pieces are `AuthShell`, `LocationAutocomplete`, `PasswordStrength`, `AppLoader`.
- `frontend/src/pages/` — `LoginPage`, `RegisterPage`, `ProductsPage`, `InvoicesPage`.
- `frontend/src/routes/` — file-based TanStack Router routes; `_app.jsx` is the authenticated layout, `login.jsx` and `registro.jsx` are public.
- `frontend/src/auth-context.jsx` — session state (`user`, `loading`, `login`, `register`, `logout`).
- `frontend/src/api.js` — all API calls (`/api` relative). `frontend/src/lib/format.js` — currency/date/unit formatting.
- `frontend/src/index.css` — Tailwind import, `@theme` design tokens, and base styles.
- `data/` — runtime JSON state (`inventario.json`, `facturas.json`), gitignored; created on demand.

## API

`GET/POST /api/products`, `DELETE /api/products/<nombre>`, `GET/POST /api/invoices`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/perfil`, `POST /api/auth/password`, `GET /api/auth/ubicaciones`.

## Gotchas

- `data/*.json` is local state (only `ejemplo_*.json` is tracked). If `data/inventario.json` is missing, `cargar_datos()` seeds four sample products.
- Auth: users live in `data/usuarios.json` with `scrypt` password hashes (never plaintext). Registration is open and asks for nombres, apellidos, usuario, residencia (Cuban municipality), optional email, and a zxcvbn-strong password.
- Every `/api/*` and `/uploads/*` request except the `/api/auth` routes requires the session cookie; the SPA redirects to `/login` when `GET /api/auth/me` returns 401.
- `SECRET_KEY` and `SESSION_COOKIE_SECURE` are read from the environment; without `SECRET_KEY`, a stable key is generated at `data/secret_key`. Set `SESSION_COOKIE_SECURE=1` behind HTTPS.
- Session state is a signed Flask cookie (`session['usuario']`), not a database. Logout only clears that cookie.
- Residence validation accepts `Municipio, Provincia` or a unique municipality name; duplicate names such as San Luis require the province.
- Login rate limit lives in `limitador.py` and is per-process: 5 failures per IP+usuario and 10 per IP in 15 minutes, blocked for 15 minutes, then a successful login clears both counters. Configure with `LOGIN_MAX_INTENTOS`, `LOGIN_MAX_INTENTOS_IP`, `LOGIN_VENTANA_SEGUNDOS`, `LOGIN_BLOQUEO_SEGUNDOS`. It returns `429` with `Retry-After`.
- `data/facturas.json` stores items as `[product_dict, cantidad]` pairs, not objects; both loaders assume that shape.
- Invoice numbers: the server owns `next_invoice_number` (module global, restored from existing invoices). The client sends `numero` on POST but the server ignores it — do not rely on the client value.
- Frontend cart state is `{ producto, cantidad }` and JSON field names are Spanish (`nombre`, `precio`, `unidad_medida`, `cantidad`). Keep the React components and `app.py` in sync.
- `Carrito.addChart` is spelled that way (not `addToCart`); `Carrito`/`Inventario` use camelCase methods while `Factura`/`GestorFacturas` mostly use snake_case.
- Tailwind v4: add colors/fonts in the `@theme` block in `frontend/src/index.css`; there is no `tailwind.config.js`.
- The app stores all state in JSON files (`data/`); there is no database. Auth is a signed session cookie backed by `data/usuarios.json`.
- UI copy uses neutral Spanish (tuteo, not voseo). Branding is **Venture** and prices are formatted in CUP with `es-ES` locale.
- `README.md` is UTF-8. Older copies were UTF-16LE with a BOM; if you see a BOM, normalize the file to UTF-8.
