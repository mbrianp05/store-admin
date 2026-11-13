import { createFileRoute, Navigate, useRouterState } from '@tanstack/react-router'
import App from '../App'
import AppLoader from '../components/AppLoader'
import { useAuth } from '../auth-context'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { user, loading } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (loading) {
    return <AppLoader mensaje="Verificando tu sesión…" />
  }

  // El catálogo es público; las facturas y el perfil siguen siendo solo para cuentas.
  const rutaPrivada =
    pathname.startsWith('/facturas') || pathname.startsWith('/perfil')
  if (!user && rutaPrivada) {
    return <Navigate to="/login" replace />
  }

  return <App />
}
