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

  // El catálogo es público; las facturas siguen siendo solo para cuentas.
  if (!user && pathname.startsWith('/facturas')) {
    return <Navigate to="/login" replace />
  }

  return <App />
}
