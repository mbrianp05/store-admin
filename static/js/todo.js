// Estado de la aplicación
const state = {
    products: [],
    cart: [],
    invoices: [],
    currentView: 'products',
    nextInvoiceNumber: 1
};

const API_URL = '/api';

// Helpers
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Cargar productos desde el backend
export async function loadProducts() {
    const data = await fetchAPI('/products');
    if (data) {
        state.products = data;
        renderProducts();
    }
    return state.products;
}

// Cargar facturas desde el backend
export async function loadInvoices() {
    const data = await fetchAPI('/invoices');
    if (data) {
        state.invoices = data;
        if (data.length > 0) {
            state.nextInvoiceNumber = Math.max(...data.map(i => i.numero)) + 1;
        }
        renderInvoices();
    }
    return state.invoices;
}

// Renderizar productos
function renderProducts() {
    const container = document.getElementById('products_container');
    if (!container) {
        console.error('products_container no encontrado');
        return;
    }

    // Header con título y botón
    let html = `
        <div class="products-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1E293B;">📦 Productos</h2>
            <button id="add_product_button" style="background: #3B82F6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                + Agregar Producto
            </button>
        </div>
    `;

    const searchTerm = document.getElementById('searchbar')?.value.toLowerCase() || '';
    const filtered = state.products.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm)
    );

    if (state.products.length === 0) {
        html += `
            <div class="empty-state" style="text-align: center; padding: 50px 20px; color: #64748B;">
                <span style="font-size: 48px; display: block; margin-bottom: 16px;">📦</span>
                <h3 style="color: #1E293B; margin-bottom: 8px;">No hay productos</h3>
                <p>Agrega tu primer producto usando el botón "Agregar Producto"</p>
            </div>
        `;
        container.innerHTML = html;
        document.getElementById('add_product_button')?.addEventListener('click', showAddProductModal);
        return;
    }

    if (filtered.length === 0) {
        html += `
            <div class="empty-state" style="text-align: center; padding: 50px 20px; color: #64748B;">
                <span style="font-size: 48px; display: block; margin-bottom: 16px;">🔍</span>
                <h3 style="color: #1E293B; margin-bottom: 8px;">No se encontraron productos</h3>
                <p>Prueba con otra búsqueda</p>
            </div>
        `;
        container.innerHTML = html;
        document.getElementById('add_product_button')?.addEventListener('click', showAddProductModal);
        return;
    }

    // Tabla de productos
    html += `
        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #1E293B; color: white;">
                    <tr>
                        <th style="padding: 12px 16px; text-align: left; font-weight: 500;">Nombre</th>
                        <th style="padding: 12px 16px; text-align: left; font-weight: 500;">Precio</th>
                        <th style="padding: 12px 16px; text-align: left; font-weight: 500;">Unidad</th>
                        <th style="padding: 12px 16px; text-align: left; font-weight: 500;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtered.forEach(p => {
        const inCart = state.cart.some(item => item.producto.nombre === p.nombre);
        html += `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 16px;">
                    <strong>${p.nombre}</strong>
                    ${p.descripcion ? `<br><small style="color: #64748B;">${p.descripcion}</small>` : ''}
                </td>
                <td style="padding: 12px 16px;">$${p.precio.toFixed(2)}</td>
                <td style="padding: 12px 16px;">${p.unidad_medida === 'metro' ? 'Metro' : 'Unidad'}</td>
                <td style="padding: 12px 16px;">
                    <button class="add-to-cart" data-name="${p.nombre}" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px;" title="Agregar al carrito">
                        ${inCart ? '🛒' : '➕'}
                    </button>
                    <button class="remove-product" data-name="${p.nombre}" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; color: #EF4444;" title="Eliminar producto">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Event listeners
    document.getElementById('add_product_button')?.addEventListener('click', showAddProductModal);
    
    container.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.name;
            const product = state.products.find(p => p.nombre === name);
            if (product) addToCart(product);
        });
    });

    container.querySelectorAll('.remove-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.name;
            if (confirm(`¿Eliminar "${name}" del inventario?`)) {
                removeProduct(name);
            }
        });
    });
}

// Renderizar facturas
function renderInvoices() {
    const container = document.getElementById('invoices_container');
    if (!container) return;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1E293B;">🧾 Facturas</h2>
            <span style="color: #64748B;">Total: ${state.invoices.length}</span>
        </div>
    `;

    if (state.invoices.length === 0) {
        html += `
            <div style="text-align: center; padding: 50px 20px; color: #64748B; background: white; border-radius: 12px;">
                <span style="font-size: 48px; display: block; margin-bottom: 16px;">🧾</span>
                <h3 style="color: #1E293B; margin-bottom: 8px;">No hay facturas</h3>
                <p>Genera tu primera factura agregando productos al carrito</p>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    state.invoices.forEach(f => {
        html += `
            <div class="invoice-card" data-number="${f.numero}" style="background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: box-shadow 0.2s;">
                <div style="display: flex; gap: 24px; align-items: center;">
                    <span style="font-weight: 700; color: #3B82F6;">#${f.numero}</span>
                    <span style="color: #64748B; font-size: 14px;">${f.fecha}</span>
                </div>
                <span style="font-weight: 700; font-size: 18px; color: #1E293B;">$${f.total.toFixed(2)}</span>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.invoice-card').forEach(card => {
        card.addEventListener('click', () => {
            const number = parseInt(card.dataset.number);
            showInvoiceDetail(number);
        });
    });
}

// Agregar al carrito
export function addToCart(product) {
    const existing = state.cart.find(item => item.producto.nombre === product.nombre);
    if (existing) {
        existing.cantidad += 1;
    } else {
        state.cart.push({
            producto: product,
            cantidad: 1
        });
    }
    updateCartBadge();
    renderProducts();
}

// Eliminar del carrito
export function removeFromCart(productName) {
    state.cart = state.cart.filter(item => item.producto.nombre !== productName);
    updateCartBadge();
    renderCartModal();
}

// Actualizar badge del carrito
function updateCartBadge() {
    const badge = document.getElementById('cart_badge');
    if (badge) {
        const total = state.cart.reduce((sum, item) => sum + item.cantidad, 0);
        badge.textContent = total;
        badge.style.display = total > 0 ? 'inline' : 'none';
    }
}

// Mostrar modal del carrito
export function showCartModal() {
    const modal = document.getElementById('cart_modal');
    modal.classList.remove('hidden');
    renderCartModal();
}

function renderCartModal() {
    const container = document.getElementById('cart_items');
    const totalSpan = document.getElementById('cart_total_amount');

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; color: #64748B;">
                <span style="font-size: 48px; display: block; margin-bottom: 16px;">🛒</span>
                <h3 style="color: #1E293B; margin-bottom: 8px;">Carrito vacío</h3>
                <p>Agrega productos desde el inventario</p>
            </div>
        `;
        totalSpan.textContent = '0.00';
        return;
    }

    let html = '';
    let total = 0;
    state.cart.forEach(item => {
        const subtotal = item.producto.precio * item.cantidad;
        total += subtotal;
        html += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
                <div>
                    <span style="font-weight: 600;">${item.producto.nombre}</span>
                    <span style="color: #64748B; margin-left: 8px;">x ${item.cantidad}</span>
                </div>
                <div>
                    <span style="font-weight: 600;">$${subtotal.toFixed(2)}</span>
                    <button class="remove-from-cart" data-name="${item.producto.nombre}" style="background: none; border: none; cursor: pointer; color: #EF4444; margin-left: 12px; font-size: 16px;">✕</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalSpan.textContent = total.toFixed(2);

    container.querySelectorAll('.remove-from-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.name);
        });
    });
}

// Generar factura
export async function generateInvoice() {
    if (state.cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    const invoiceData = {
        numero: state.nextInvoiceNumber,
        items: state.cart.map(item => ({
            producto: item.producto,
            cantidad: item.cantidad
        }))
    };

    const result = await fetchAPI('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
    });

    if (result) {
        state.invoices.push(result);
        state.nextInvoiceNumber++;
        state.cart = [];
        updateCartBadge();
        document.getElementById('cart_modal').classList.add('hidden');
        showInvoiceDetail(result.numero);
        renderInvoices();
        renderProducts();
    }
}

// Mostrar detalle de factura
export function showInvoiceDetail(number) {
    const invoice = state.invoices.find(f => f.numero === number);
    if (!invoice) return;

    const modal = document.getElementById('invoice_modal');
    document.getElementById('invoice_number').textContent = invoice.numero;
    document.getElementById('invoice_date').textContent = invoice.fecha;

    const container = document.getElementById('invoice_items');
    let html = '';
    invoice.items.forEach(item => {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0;">
                <div>
                    <strong>${item.producto.nombre}</strong>
                    <span style="color: #64748B; font-size: 14px;"> x ${item.cantidad} ${item.producto.unidad_medida === 'metro' ? 'metros' : 'unidades'}</span>
                </div>
                <span style="font-weight: 600;">$${(item.producto.precio * item.cantidad).toFixed(2)}</span>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('invoice_total_amount').textContent = invoice.total.toFixed(2);

    modal.classList.remove('hidden');
}

// Agregar producto
export async function addProduct() {
    const nameField = document.getElementById('name');
    const priceField = document.getElementById('price');
    const unitField = document.getElementById('unit');
    const descField = document.getElementById('desc');

    const name = nameField?.value.trim() || '';
    const price = parseFloat(priceField?.value || '0');
    const unidad_medida = unitField?.value || 'unidad';
    const descripcion = descField?.value.trim() || '';

    if (!name || isNaN(price) || price <= 0) {
        alert('Por favor, completa todos los campos correctamente');
        return;
    }

    const product = {
        nombre: name,
        precio: price,
        unidad_medida: unidad_medida,
        descripcion: descripcion,
        foto: null
    };

    const result = await fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(product)
    });

    if (result) {
        state.products.push(result);
        renderProducts();
        hideAddProductModal();
        if (nameField) nameField.value = '';
        if (priceField) priceField.value = '';
        if (descField) descField.value = '';
    }
}

// Eliminar producto
export async function removeProduct(name) {
    const result = await fetchAPI(`/products/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    });

    if (result && result.success) {
        state.products = state.products.filter(p => p.nombre !== name);
        state.cart = state.cart.filter(item => item.producto.nombre !== name);
        renderProducts();
        updateCartBadge();
    }
}

// Mostrar vista
export function showView(view) {
    const productsView = document.getElementById('products_view');
    const invoicesView = document.getElementById('invoices_view');
    const productsContainer = document.getElementById('products_container');
    const invoicesContainer = document.getElementById('invoices_container');
    
    // Ocultar todas las vistas
    if (productsView) productsView.style.display = 'none';
    if (invoicesView) invoicesView.style.display = 'none';
    
    // Mostrar la vista seleccionada
    if (view === 'products') {
        if (productsView) {
            productsView.style.display = 'block';
            productsView.classList.add('active');
        }
        renderProducts();
    } else if (view === 'invoices') {
        if (invoicesView) {
            invoicesView.style.display = 'block';
            invoicesView.classList.add('active');
        }
        renderInvoices();
    } else if (view === 'cart') {
        showCartModal();
    }

    // Actualizar botones del sidebar
    document.querySelectorAll('.section_button').forEach(b => b.classList.remove('active'));
    const button = document.querySelector(`[data-section="${view}"]`);
    if (button) button.classList.add('active');

    state.currentView = view;
}

// Modal functions
export function showAddProductModal() {
    document.getElementById('add_product_modal')?.classList.remove('hidden');
}

export function hideAddProductModal() {
    document.getElementById('add_product_modal')?.classList.add('hidden');
}

// Inicialización
export function initApp() {
    console.log('🚀 Iniciando aplicación...');
    
    // Cargar datos
    loadProducts();
    loadInvoices();

    // Navegación
    document.querySelectorAll('.section_button').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            console.log('📱 Navegando a:', section);
            if (section === 'cart') {
                showCartModal();
            } else {
                showView(section);
            }
        });
    });

    // Modal Producto
    document.getElementById('cancel_button')?.addEventListener('click', hideAddProductModal);
    document.getElementById('accept_button')?.addEventListener('click', addProduct);

    // Modal Carrito
    document.getElementById('close_cart_button')?.addEventListener('click', () => {
        document.getElementById('cart_modal')?.classList.add('hidden');
    });
    document.getElementById('checkout_button')?.addEventListener('click', generateInvoice);

    // Modal Factura
    document.getElementById('close_invoice_button')?.addEventListener('click', () => {
        document.getElementById('invoice_modal')?.classList.add('hidden');
    });

    // Búsqueda
    document.getElementById('searchbar')?.addEventListener('input', renderProducts);

    // Mostrar vista inicial
    showView('products');
    
    console.log('✅ Aplicación iniciada correctamente');
}