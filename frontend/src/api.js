const API_URL = '/api'

export class ApiError extends Error {
  constructor(message, status, campos) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.campos = campos || null
  }
}

async function request(path, options = {}) {
  const { headers, ...rest } = options
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  if (response.status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new Event('auth:unauthorized'))
  }

  if (!response.ok) {
    let message = `La API respondió con un error ${response.status}.`
    let campos = null
    try {
      const data = await response.json()
      message = data.error || data.detalle || message
      campos = data.campos || null
    } catch {
      // La respuesta no era JSON; conservamos el mensaje genérico.
    }
    throw new ApiError(message, response.status, campos)
  }

  if (response.status === 204) return null
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

export function getSession() {
  return request('/auth/me')
}

export function login(usuario, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
  })
}

export function register(datos) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function logout() {
  return request('/auth/logout', {
    method: 'POST',
  })
}

export function getUbicaciones() {
  return request('/auth/ubicaciones')
}
