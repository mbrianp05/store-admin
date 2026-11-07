const API_URL = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    let message = `La API respondió con un error ${response.status}.`
    try {
      const data = await response.json()
      message = data.error || data.detalle || message
    } catch {
      // La respuesta no era JSON; conservamos el mensaje genérico.
    }
    throw new Error(message)
  }

  return response.json()
}

export function getProducts() {
  return request('/products')
}

export function createProduct(product) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  })
}

export function updateProduct(nombre, product) {
  return request(`/products/${encodeURIComponent(nombre)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  })
}

export async function uploadProductPhoto(file) {
  const body = new FormData()
  body.append('foto', file)

  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    let message = 'No se pudo subir la foto.'
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // Respuesta no JSON; usamos el mensaje genérico.
    }
    throw new Error(message)
  }

  return response.json()
}

export function deleteProduct(nombre) {
  return request(`/products/${encodeURIComponent(nombre)}`, {
    method: 'DELETE',
  })
}

export function getInvoices() {
  return request('/invoices')
}

export function createInvoice(items) {
  return request('/invoices', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}
