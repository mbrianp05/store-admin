import { useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Eye,
  EyeOff,
  LoaderCircle,
  UserPlus,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuth } from '../auth-context'
import { getAuthEstado, getUbicaciones } from '../api'
import AppLoader from '../components/AppLoader'
import AuthShell from '../components/AuthShell'
import LocationAutocomplete, {
  etiquetaUbicacion,
} from '../components/LocationAutocomplete'
import PasswordStrength from '../components/PasswordStrength'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { evaluarPassword, SCORE_MINIMO } from '@/lib/password'
import { normalizarTexto } from '@/lib/text'
import { cn } from '@/lib/utils'

const USUARIO_PATTERN = /^[A-Za-z0-9._-]{3,30}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

const DATOS_INICIALES = {
  nombres: '',
  apellidos: '',
  usuario: '',
  residencia: '',
  email: '',
  password: '',
  repetir: '',
}

function Campo({ id, label, error, hint, children }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(DATOS_INICIALES)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [ubicaciones, setUbicaciones] = useState([])
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true)
  const [errorUbicaciones, setErrorUbicaciones] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [primerUsuario, setPrimerUsuario] = useState(false)

  useEffect(() => {
    let activo = true

    getAuthEstado()
      .then((estado) => {
        if (activo) setPrimerUsuario(Boolean(estado.primer_usuario_admin))
      })
      .catch(() => {
        // Si falla, el registro sigue disponible sin el aviso de administración.
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true

    getUbicaciones()
      .then((lista) => {
        if (activo) setUbicaciones(lista)
      })
      .catch((ubicacionesError) => {
        if (activo) setErrorUbicaciones(ubicacionesError.message)
      })
      .finally(() => {
        if (activo) setCargandoUbicaciones(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const scorePassword = useMemo(
    () => evaluarPassword(datos.password)?.score ?? 0,
    [datos.password],
  )

  const residenciaCanonica = useMemo(() => {
    const buscada = normalizarTexto(datos.residencia)
    const encontrada = ubicaciones.find(
      (ubicacion) => normalizarTexto(etiquetaUbicacion(ubicacion)) === buscada,
    )
    return encontrada ? etiquetaUbicacion(encontrada) : null
  }, [datos.residencia, ubicaciones])

  if (loading) {
    return <AppLoader mensaje="Verificando tu sesión…" />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  function actualizar(campo, valor) {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => {
      if (!actual[campo]) return actual
      const copia = { ...actual }
      delete copia[campo]
      return copia
    })
  }

  function validar() {
    const nuevos = {}
    const nombres = datos.nombres.trim()
    const apellidos = datos.apellidos.trim()
    const usuario = datos.usuario.trim()
    const email = datos.email.trim()

    if (!nombres) nuevos.nombres = 'Ingresa tus nombres.'
    if (!apellidos) nuevos.apellidos = 'Ingresa tus apellidos.'

    if (!usuario) {
      nuevos.usuario = 'Elige un nombre de usuario.'
    } else if (!USUARIO_PATTERN.test(usuario)) {
      nuevos.usuario =
        'Entre 3 y 30 caracteres: letras, números, puntos, guiones o guiones bajos.'
    }

    if (!datos.residencia.trim()) {
      nuevos.residencia = 'Indica dónde vives.'
    } else if (!residenciaCanonica) {
      nuevos.residencia = 'Elige un municipio de Cuba de la lista.'
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      nuevos.email = 'Ingresa un correo electrónico válido.'
    }

    if (!datos.password) {
      nuevos.password = 'Elige una contraseña.'
    } else if (datos.password.length < 8) {
      nuevos.password = 'Usa al menos 8 caracteres.'
    } else if (scorePassword < SCORE_MINIMO) {
      nuevos.password = 'La contraseña es fácil de adivinar: suma palabras.'
    }

    if (datos.repetir !== datos.password) {
      nuevos.repetir = 'Las contraseñas no coinciden.'
    }

    return nuevos
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorGeneral('')

    const nuevosErrores = validar()
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      setErrorGeneral('Revisa los campos marcados.')
      return
    }

    setEnviando(true)
    try {
      await register({
        nombres: datos.nombres.trim(),
        apellidos: datos.apellidos.trim(),
        usuario: datos.usuario.trim(),
        residencia: residenciaCanonica,
        email: datos.email.trim(),
        password: datos.password,
      })
      toast.success(`Bienvenido, ${datos.nombres.trim()}.`)
      navigate({ to: '/' })
    } catch (registroError) {
      if (registroError.campos) {
        setErrores(registroError.campos)
      }
      setErrorGeneral(registroError.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      description="Solo se aceptan personas que vivan en Cuba."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-highlight"
          >
            Ingresa
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {primerUsuario && (
          <div className="flex gap-3 rounded-xl border border-highlight/30 bg-highlight/[0.07] p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-highlight/15 text-highlight">
              <Crown className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-highlight">
                Serás la cuenta administradora
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Al ser la primera cuenta de Venture, tendrás acceso a la gestión
                de usuarios y al panel de contabilidad desde el primer ingreso.
              </p>
            </div>
          </div>
        )}

        {errorGeneral && (
          <Alert variant="destructive">
            <AlertDescription>{errorGeneral}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nombres" label="Nombres" error={errores.nombres}>
            <Input
              id="nombres"
              name="nombres"
              autoComplete="given-name"
              placeholder="María"
              value={datos.nombres}
              onChange={(event) => actualizar('nombres', event.target.value)}
              aria-invalid={Boolean(errores.nombres)}
              aria-describedby={errores.nombres ? 'nombres-error' : undefined}
              className={cn(errores.nombres && 'border-destructive')}
              required
            />
          </Campo>

          <Campo id="apellidos" label="Apellidos" error={errores.apellidos}>
            <Input
              id="apellidos"
              name="apellidos"
              autoComplete="family-name"
              placeholder="Pérez"
              value={datos.apellidos}
              onChange={(event) => actualizar('apellidos', event.target.value)}
              aria-invalid={Boolean(errores.apellidos)}
              aria-describedby={errores.apellidos ? 'apellidos-error' : undefined}
              className={cn(errores.apellidos && 'border-destructive')}
              required
            />
          </Campo>
        </div>

        <Campo id="usuario" label="Usuario" error={errores.usuario}>
          <Input
            id="usuario"
            name="usuario"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="maria.perez"
            value={datos.usuario}
            onChange={(event) => actualizar('usuario', event.target.value)}
            aria-invalid={Boolean(errores.usuario)}
            aria-describedby={errores.usuario ? 'usuario-error' : undefined}
            className={cn(errores.usuario && 'border-destructive')}
            required
          />
        </Campo>

        <Campo
          id="residencia"
          label="¿Dónde vives?"
          error={errores.residencia}
          hint={
            <p className="text-xs text-muted-foreground">
              {cargandoUbicaciones
                ? 'Cargando municipios de Cuba…'
                : errorUbicaciones
                  ? `No se pudieron cargar los municipios: ${errorUbicaciones}`
                  : 'Empieza a escribir y elige un municipio de la lista.'}
            </p>
          }
        >
          <LocationAutocomplete
            id="residencia"
            value={datos.residencia}
            onChange={(valor) => actualizar('residencia', valor)}
            ubicaciones={ubicaciones}
            error={errores.residencia}
            disabled={cargandoUbicaciones || Boolean(errorUbicaciones)}
          />
        </Campo>

        <Campo id="email" label="Correo electrónico (opcional)" error={errores.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="maria@ejemplo.cu"
            value={datos.email}
            onChange={(event) => actualizar('email', event.target.value)}
            aria-invalid={Boolean(errores.email)}
            aria-describedby={errores.email ? 'email-error' : undefined}
            className={cn(errores.email && 'border-destructive')}
          />
        </Campo>

        <Campo
          id="password"
          label="Contraseña"
          error={errores.password}
          hint={<PasswordStrength password={datos.password} />}
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={datos.password}
              onChange={(event) => actualizar('password', event.target.value)}
              aria-invalid={Boolean(errores.password)}
              aria-describedby={errores.password ? 'password-error' : undefined}
              className={cn('pr-9', errores.password && 'border-destructive')}
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
        </Campo>

        <Campo id="repetir" label="Repetir contraseña" error={errores.repetir}>
          <Input
            id="repetir"
            name="repetir"
            type={verPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={datos.repetir}
            onChange={(event) => actualizar('repetir', event.target.value)}
            aria-invalid={Boolean(errores.repetir)}
            aria-describedby={errores.repetir ? 'repetir-error' : undefined}
            className={cn(errores.repetir && 'border-destructive')}
            required
          />
        </Campo>

        <Button
          type="submit"
          disabled={enviando || cargandoUbicaciones}
          className="mt-1"
        >
          {enviando ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthShell>
  )
}
