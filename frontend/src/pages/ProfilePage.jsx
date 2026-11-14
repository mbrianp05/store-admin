import { useEffect, useMemo, useState } from 'react'
import {
  AtSign,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  ReceiptText,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAppState } from '../app-context'
import { useAuth } from '../auth-context'
import { getUbicaciones } from '../api'
import LocationAutocomplete, {
  etiquetaUbicacion,
} from '../components/LocationAutocomplete'
import PasswordStrength from '../components/PasswordStrength'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { evaluarPassword, SCORE_MINIMO } from '@/lib/password'
import { ROL_INFO, rolDe } from '@/lib/roles'
import { normalizarTexto } from '@/lib/text'
import { cn } from '@/lib/utils'

const USUARIO_PATTERN = /^[A-Za-z0-9._-]{3,30}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
const fieldClass = 'bg-background/50 focus-visible:bg-background/70'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function formatearFechaAlta(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  return `${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

function Campo({ id, label, error, hint, children }) {
  return (
    <div className="grid content-start gap-2">
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

function PasswordInput({ id, name, autoComplete, value, onChange, invalid, describedBy }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder="••••••••"
        value={value}
        onChange={onChange}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn('px-9', fieldClass, invalid && 'border-destructive')}
      />
      <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setVisible((actual) => !actual)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function inicialesDe(user) {
  const letras = [user.nombres, user.apellidos]
    .map((parte) => String(parte || '').trim())
    .filter(Boolean)
    .map((parte) => parte[0])
    .join('')
  return (letras || String(user.usuario || '?').slice(0, 2)).toUpperCase()
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth()
  const { invoices } = useAppState()

  const [datos, setDatos] = useState(() => ({
    usuario: user?.usuario ?? '',
    residencia: user?.residencia ?? '',
    email: user?.email ?? '',
  }))
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [password, setPassword] = useState({
    actual: '',
    nueva: '',
    repetir: '',
  })
  const [erroresPassword, setErroresPassword] = useState({})
  const [errorPassword, setErrorPassword] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  const [ubicaciones, setUbicaciones] = useState([])
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true)
  const [errorUbicaciones, setErrorUbicaciones] = useState('')

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

  const residenciaCanonica = useMemo(() => {
    const buscada = normalizarTexto(datos.residencia)
    const encontrada = ubicaciones.find(
      (ubicacion) => normalizarTexto(etiquetaUbicacion(ubicacion)) === buscada,
    )
    return encontrada ? etiquetaUbicacion(encontrada) : null
  }, [datos.residencia, ubicaciones])

  const scorePassword = useMemo(
    () => evaluarPassword(password.nueva)?.score ?? 0,
    [password.nueva],
  )

  if (!user) return null

  const alta = formatearFechaAlta(user.creado)
  const rol = rolDe(user)
  const rolInfo = ROL_INFO[rol]
  const hayCambios =
    datos.usuario.trim() !== user.usuario ||
    datos.residencia.trim() !== user.residencia ||
    datos.email.trim() !== (user.email || '')

  function actualizarCampo(campo, valor) {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => {
      if (!actual[campo]) return actual
      const copia = { ...actual }
      delete copia[campo]
      return copia
    })
  }

  function actualizarPassword(campo, valor) {
    setPassword((actual) => ({ ...actual, [campo]: valor }))
    setErroresPassword((actual) => {
      if (!actual[campo]) return actual
      const copia = { ...actual }
      delete copia[campo]
      return copia
    })
  }

  function validarPerfil() {
    const nuevos = {}
    const usuario = datos.usuario.trim()
    const email = datos.email.trim()

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

    return nuevos
  }

  async function guardarPerfil(event) {
    event.preventDefault()
    setErrorGeneral('')

    const nuevosErrores = validarPerfil()
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      setErrorGeneral('Revisa los campos marcados.')
      return
    }

    setGuardando(true)
    try {
      const sesion = await updateProfile({
        usuario: datos.usuario.trim(),
        residencia: residenciaCanonica,
        email: datos.email.trim(),
      })
      setDatos({
        usuario: sesion.usuario,
        residencia: sesion.residencia,
        email: sesion.email || '',
      })
      setErrores({})
      toast.success('Datos de la cuenta actualizados.')
    } catch (perfilError) {
      if (perfilError.campos) setErrores(perfilError.campos)
      setErrorGeneral(perfilError.message)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPassword(event) {
    event.preventDefault()
    setErrorPassword('')

    const nuevosErrores = {}
    if (!password.actual) {
      nuevosErrores.password_actual = 'Ingresa tu contraseña actual.'
    }
    if (!password.nueva) {
      nuevosErrores.password_nueva = 'Elige una contraseña nueva.'
    } else if (password.nueva.length < 8) {
      nuevosErrores.password_nueva = 'Usa al menos 8 caracteres.'
    } else if (scorePassword < SCORE_MINIMO) {
      nuevosErrores.password_nueva = 'La contraseña es fácil de adivinar: suma palabras.'
    } else if (password.nueva === password.actual) {
      nuevosErrores.password_nueva = 'Usa una contraseña distinta a la actual.'
    }
    if (password.repetir !== password.nueva) {
      nuevosErrores.password_repetir = 'Las contraseñas no coinciden.'
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresPassword(nuevosErrores)
      setErrorPassword('Revisa los campos marcados.')
      return
    }

    setCambiandoPassword(true)
    try {
      await changePassword(password.actual, password.nueva)
      setPassword({ actual: '', nueva: '', repetir: '' })
      setErroresPassword({})
      toast.success('Contraseña actualizada.')
    } catch (passwordError) {
      if (passwordError.campos) setErroresPassword(passwordError.campos)
      setErrorPassword(passwordError.message)
    } finally {
      setCambiandoPassword(false)
    }
  }

  const facturasEmitidas = invoices.length

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tu cuenta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualiza cómo te ven en Venture y protege tu acceso.
          </p>
        </div>
        {alta && (
          <Badge
            variant="outline"
            className="gap-1.5 border-border/80 px-2.5 py-1 text-muted-foreground"
          >
            <CalendarDays className="size-3" />
            Miembro desde {alta}
          </Badge>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative border-b border-border/70 px-6 py-6">
            <span
              aria-hidden="true"
              className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-highlight/70 to-transparent"
            />
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-full border border-highlight/30 bg-highlight/10 text-lg font-semibold tracking-wide text-highlight">
                {inicialesDe(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-medium leading-tight text-foreground">
                  {user.nombres} {user.apellidos}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  @{user.usuario}
                </p>
                <Badge
                  variant="outline"
                  className={cn('mt-2 w-fit', rolInfo.clase)}
                >
                  {rolInfo.etiqueta}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="grid gap-4 px-6 py-5 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Residencia</dt>
                <dd className="mt-0.5 break-words text-foreground">
                  {user.residencia || 'Sin definir'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Correo</dt>
                <dd className="mt-0.5 break-all text-foreground">
                  {user.email || (
                    <span className="text-muted-foreground">Sin enlazar</span>
                  )}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Facturas emitidas</dt>
                <dd className="mt-0.5 text-foreground">{facturasEmitidas}</dd>
              </div>
            </div>
          </dl>

          <div className="border-t border-border/70 px-6 py-4">
            <Link
              to="/facturas"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver mis facturas
              <ReceiptText className="size-3.5" />
            </Link>
          </div>
        </aside>

        <div className="grid gap-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border/70 py-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground">
                  <UserRound className="size-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Datos de la cuenta</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tu usuario identifica tus facturas; la residencia y el correo son
                    datos de contacto.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="py-5">
              <form onSubmit={guardarPerfil} className="grid gap-4" noValidate>
                {errorGeneral && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorGeneral}</AlertDescription>
                  </Alert>
                )}

                <Campo id="perfil-usuario" label="Nombre de usuario" error={errores.usuario}>
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="perfil-usuario"
                      name="usuario"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="maria.perez"
                      value={datos.usuario}
                      onChange={(event) => actualizarCampo('usuario', event.target.value)}
                      aria-invalid={Boolean(errores.usuario)}
                      aria-describedby={errores.usuario ? 'perfil-usuario-error' : undefined}
                      className={cn('pl-9', fieldClass, errores.usuario && 'border-destructive')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si lo cambias, debe estar libre. Tus facturas se mantienen.
                  </p>
                </Campo>

                <Campo
                  id="perfil-residencia"
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
                    id="perfil-residencia"
                    value={datos.residencia}
                    onChange={(valor) => actualizarCampo('residencia', valor)}
                    ubicaciones={ubicaciones}
                    error={errores.residencia}
                    disabled={cargandoUbicaciones || Boolean(errorUbicaciones)}
                    dropUp
                  />
                </Campo>

                <Campo id="perfil-email" label="Correo electrónico (opcional)" error={errores.email}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="perfil-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="maria@ejemplo.cu"
                      value={datos.email}
                      onChange={(event) => actualizarCampo('email', event.target.value)}
                      aria-invalid={Boolean(errores.email)}
                      aria-describedby={errores.email ? 'perfil-email-error' : undefined}
                      className={cn('pl-9', fieldClass, errores.email && 'border-destructive')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Déjalo vacío y guarda para desenlazarlo.
                  </p>
                </Campo>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {hayCambios ? 'Tienes cambios sin guardar.' : 'Todo está guardado.'}
                  </p>
                  <Button
                    type="submit"
                    disabled={
                      guardando || !hayCambios || cargandoUbicaciones || !residenciaCanonica
                    }
                  >
                    {guardando ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border/70 py-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Contraseña</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cambia tu contraseña cuando quieras. Se pedirá la actual para confirmar.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="py-5">
              <form onSubmit={guardarPassword} className="grid gap-4" noValidate>
                {errorPassword && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorPassword}</AlertDescription>
                  </Alert>
                )}

                <Campo
                  id="password-actual"
                  label="Contraseña actual"
                  error={erroresPassword.password_actual}
                >
                  <PasswordInput
                    id="password-actual"
                    name="password_actual"
                    autoComplete="current-password"
                    value={password.actual}
                    onChange={(event) => actualizarPassword('actual', event.target.value)}
                    invalid={Boolean(erroresPassword.password_actual)}
                    describedBy={
                      erroresPassword.password_actual
                        ? 'password-actual-error'
                        : undefined
                    }
                  />
                </Campo>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id="password-nueva"
                    label="Nueva contraseña"
                    error={erroresPassword.password_nueva}
                    hint={<PasswordStrength password={password.nueva} />}
                  >
                    <PasswordInput
                      id="password-nueva"
                      name="password_nueva"
                      autoComplete="new-password"
                      value={password.nueva}
                      onChange={(event) => actualizarPassword('nueva', event.target.value)}
                      invalid={Boolean(erroresPassword.password_nueva)}
                      describedBy={
                        erroresPassword.password_nueva
                          ? 'password-nueva-error'
                          : undefined
                      }
                    />
                  </Campo>

                  <Campo
                    id="password-repetir"
                    label="Repetir nueva contraseña"
                    error={erroresPassword.password_repetir}
                  >
                    <PasswordInput
                      id="password-repetir"
                      name="password_repetir"
                      autoComplete="new-password"
                      value={password.repetir}
                      onChange={(event) =>
                        actualizarPassword('repetir', event.target.value)
                      }
                      invalid={Boolean(erroresPassword.password_repetir)}
                      describedBy={
                        erroresPassword.password_repetir
                          ? 'password-repetir-error'
                          : undefined
                      }
                    />
                  </Campo>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={cambiandoPassword}>
                    {cambiandoPassword ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}
                    {cambiandoPassword ? 'Cambiando…' : 'Cambiar contraseña'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
