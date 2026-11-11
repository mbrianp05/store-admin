import { createFileRoute, Navigate } from '@tanstack/react-router'
import App from '../App'
import AppLoader from '../components/AppLoader'
import { useAuth } from '../auth-context'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return <AppLoader mensaje="Verificando tu sesión…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <App />
}
