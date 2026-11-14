import { createFileRoute, Navigate, useRouterState } from '@tanstack/react-router'
import App from '../App'
import AppLoader from '../components/AppLoader'
import { useAuth } from '../auth-context'
import { esAdmin, puedeCambiarEstadoFactura } from '../lib/roles'

const RUTAS_PRIVADAS = ['/facturas', '/perfil', '/usuarios', '/contabilidad', '/envios']
const RUTAS_ADMIN = ['/usuarios', '/contabilidad']
const RUTAS_GESTION = ['/envios']

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { user, loading } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (loading) {
    return <AppLoader mensaje="Verificando tu sesión…" />
  }

  // El catálogo es público; facturas, perfil y administración exigen cuenta.
  if (!user && RUTAS_PRIVADAS.some((ruta) => pathname.startsWith(ruta))) {
    return <Navigate to="/login" replace />
  }

  // Usuarios y contabilidad son exclusivos de administración.
  if (!esAdmin(user) && RUTAS_ADMIN.some((ruta) => pathname.startsWith(ruta))) {
    return <Navigate to="/" replace />
  }

  // La gestión de envíos está reservada a empleados y administración.
  if (
    !puedeCambiarEstadoFactura(user) &&
    RUTAS_GESTION.some((ruta) => pathname.startsWith(ruta))
  ) {
    return <Navigate to="/" replace />
  }

  return <App />
}
