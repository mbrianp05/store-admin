import { useEffect, useState } from 'react'
import {
  Crown,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  User,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from '@tanstack/react-router'
import { getAuthEstado } from '../api'
import { useAuth } from '../auth-context'
import AppLoader from '../components/AppLoader'
import AuthShell from '../components/AuthShell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [primerUsuario, setPrimerUsuario] = useState(false)

  useEffect(() => {
    let activo = true

    getAuthEstado()
      .then((estado) => {
        if (activo) setPrimerUsuario(Boolean(estado.primer_usuario_admin))
      })
      .catch(() => {
        // Sin el estado público, el login sigue funcionando con normalidad.
      })

    return () => {
      activo = false
    }
  }, [])

  if (loading) {
    return <AppLoader mensaje="Verificando tu sesión…" />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!usuario.trim() || !password) {
      setError('Ingresa tu usuario y tu contraseña.')
      return
    }

    setEnviando(true)
    try {
      await login(usuario.trim(), password)
      navigate({ to: '/' })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      title="Ingresa a Venture"
      description="Inicia sesión para comprar, gestionar el inventario y emitir facturas."
      footer={
        <>
          ¿Todavía no tienes cuenta?{' '}
          <Link
            to="/registro"
            className="font-medium text-foreground underline underline-offset-4 hover:text-highlight"
          >
            Crea una
          </Link>
        </>
      }
    >
      {primerUsuario && (
        <div className="mb-5 flex gap-3 rounded-xl border border-highlight/30 bg-highlight/[0.07] p-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-highlight/15 text-highlight">
            <Crown className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-highlight">
              La primera cuenta será la administradora
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Venture todavía no tiene usuarios. La primera persona que se
              registre obtendrá el rol de administrador y podrá asignar roles al
              resto de las cuentas.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Label htmlFor="usuario">Usuario</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="usuario"
              name="usuario"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="tu.usuario"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="px-9"
              required
            />
            <button
              type="button"
              onClick={() => setVerPassword((actual) => !actual)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={enviando} className="mt-1">
          {enviando ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthShell>
  )
}
