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

export function getConfig() {
  return request('/config')
}

export function updateConfig(config) {
  return request('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

export function getInvoices() {
  return request('/invoices')
}

export function createInvoice(items, envio = null) {
  return request('/invoices', {
    method: 'POST',
    body: JSON.stringify({ items, envio }),
  })
}

export function updateInvoiceState(
  numero,
  estado,
  motivoCancelacion = '',
  usuario = '',
) {
  return request(`/invoices/${encodeURIComponent(numero)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      estado,
      motivo_cancelacion: motivoCancelacion,
      usuario,
    }),
  })
}

export function getSession() {
  return request('/auth/me')
}

export function getAuthEstado() {
  return request('/auth/estado')
}

export function getUsers() {
  return request('/admin/usuarios')
}

export function updateUserRole(usuario, rol) {
  return request(`/admin/usuarios/${encodeURIComponent(usuario)}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  })
}

export function getAccounting() {
  return request('/contabilidad')
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

export function updateProfile(datos) {
  return request('/auth/perfil', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })
}

export function changePassword(passwordActual, passwordNueva) {
  return request('/auth/password', {
    method: 'POST',
    body: JSON.stringify({
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    }),
  })
}

export function getUbicaciones() {
  return request('/auth/ubicaciones')
}
