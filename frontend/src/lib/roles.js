export const ROLES = ['cliente', 'empleado', 'admin']

export const ROL_INFO = {
  cliente: {
    etiqueta: 'Cliente',
    descripcion: 'Compra productos y emite sus propias facturas.',
    clase: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  },
  empleado: {
    etiqueta: 'Empleado',
    descripcion: 'Gestiona productos y actualiza el estado de las facturas.',
    clase: 'border-highlight/40 bg-highlight/15 text-highlight',
  },
  admin: {
    etiqueta: 'Administrador',
    descripcion: 'Administra usuarios, contabilidad y toda la operación.',
    clase: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
}

export function rolDe(user) {
  if (!user) return null
  return ROLES.includes(user.rol) ? user.rol : 'cliente'
}

export function esAdmin(user) {
  return rolDe(user) === 'admin'
}

export function esEmpleado(user) {
  return rolDe(user) === 'empleado'
}

export function puedeComprar(user) {
  return Boolean(user)
}

export function puedeGestionarProductos(user) {
  return ['empleado', 'admin'].includes(rolDe(user))
}

export function puedeCambiarEstadoFactura(user) {
  return ['empleado', 'admin'].includes(rolDe(user))
}

export function puedeVerTodasLasFacturas(user) {
  return ['empleado', 'admin'].includes(rolDe(user))
}

export function puedeGestionarUsuarios(user) {
  return esAdmin(user)
}

export function puedeVerContabilidad(user) {
  return esAdmin(user)
}

export function puedeGestionarConfig(user) {
  return esAdmin(user)
}
