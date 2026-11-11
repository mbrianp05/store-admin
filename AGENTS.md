# AGENTS.md

Inventory, cart, and invoicing app: Flask JSON API + React/Tailwind frontend. UI text, comments, and most identifiers are in Spanish — keep new user-facing strings in Spanish.

## Run

- Backend: `py app.py` → http://localhost:5000. On this Windows setup `python` is a Store stub; use `py` (Python 3.14).
- Frontend dev: `cd frontend && npm install && npm run dev` → http://localhost:5173. Vite proxies `/api` to the Flask server on port 5000.
- Production-ish: `cd frontend && npm run build`, then `py app.py`. Flask serves `frontend/dist` at `/` and the API at `/api/*`.
- Install Python deps manually: `py -m pip install flask flask-cors`. There is no `requirements.txt`.
- Lint the frontend with `cd frontend && npm run lint` (oxlint). There is no backend linter, test suite, or CI.

## Layout

- `app.py` — Flask API and static server for `frontend/dist`; the only backend entrypoint.
- `models/` — domain classes (`Producto`, `Inventario`, `Carrito`, `Factura`, `GestorFacturas`) re-exported from `models/__init__.py`. Use relative imports inside the package.
- `frontend/` — Vite + React 19 + Tailwind CSS v4. Entrypoint `src/main.jsx`; `src/App.jsx` owns view/cart/invoice state.
- `frontend/src/components/` — UI pieces; `ProductsView`, `CartPanel`, `InvoicesView`, `ProductForm`, `Sidebar`, `Toast`, `Icons`.
- `frontend/src/api.js` — all API calls (`/api` relative). `frontend/src/lib/format.js` — currency/date/unit formatting.
- `frontend/src/index.css` — Tailwind import, `@theme` design tokens, and base styles.
- `data/` — runtime JSON state (`inventario.json`, `facturas.json`), gitignored; created on demand.

## API

`GET/POST /api/products`, `DELETE /api/products/<nombre>`, `GET/POST /api/invoices`.

## Gotchas

- `data/*.json` is local state (only `ejemplo_*.json` is tracked). If `data/inventario.json` is missing, `cargar_datos()` seeds four sample products.
- `data/facturas.json` stores items as `[product_dict, cantidad]` pairs, not objects; both loaders assume that shape.
- Invoice numbers: the server owns `next_invoice_number` (module global, restored from existing invoices). The client sends `numero` on POST but the server ignores it — do not rely on the client value.
- Frontend cart state is `{ producto, cantidad }` and JSON field names are Spanish (`nombre`, `precio`, `unidad_medida`, `cantidad`). Keep the React components and `app.py` in sync.
- `Carrito.addChart` is spelled that way (not `addToCart`); `Carrito`/`Inventario` use camelCase methods while `Factura`/`GestorFacturas` mostly use snake_case.
- Tailwind v4: add colors/fonts in the `@theme` block in `frontend/src/index.css`; there is no `tailwind.config.js`.
- The app is intentionally stateless beyond the JSON files: no auth, no database, no user accounts.
- `README.md` is UTF-16LE with a BOM, so the Read tool reports it as binary. Use `Get-Content README.md -Encoding Unicode`.
