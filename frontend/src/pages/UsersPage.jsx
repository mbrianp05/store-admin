import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Crown,
  LoaderCircle,
  MapPin,
  ReceiptText,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, updateUserRole } from '../api'
import { useAuth } from '../auth-context'
import { ROLES, ROL_INFO, rolDe } from '../lib/roles'
import { normalizarTexto } from '../lib/text'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const fechaFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function formatearFecha(valor) {
  if (!valor) return 'Sin fecha'
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : fechaFormatter.format(fecha)
}

function iniciales(usuario) {
  const letras = [usuario.nombres, usuario.apellidos]
    .map((parte) => String(parte || '').trim())
    .filter(Boolean)
    .map((parte) => parte[0])
    .join('')
  return (letras || String(usuario.usuario || '?').slice(0, 2)).toUpperCase()
}

function nombreVisible(usuario) {
  const nombre = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim()
  return nombre || `@${usuario.usuario}`
}

function StatCard({ icon: Icon, etiqueta, valor, tono }) {
  return (
    <Card className="gap-0 px-4 py-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-lg border',
            tono,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{etiqueta}</p>
          <p className="text-xl font-semibold tabular-nums leading-tight">
            {valor}
          </p>
        </div>
      </div>
    </Card>
  )
}

function UsersSkeleton() {
  return (
    <ul>
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 border-t border-border/70 px-4 py-4 first:border-0"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
        </li>
      ))}
    </ul>
  )
}

export default function UsersPage() {
  const { user, refreshUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsuarios(await getUsers())
    } catch (cargaError) {
      setError(cargaError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga inicial desde la API
    cargar()
  }, [cargar])

  const conteo = useMemo(() => {
    const base = { cliente: 0, empleado: 0, admin: 0 }
    for (const usuario of usuarios) {
      base[rolDe(usuario)] += 1
    }
    return base
  }, [usuarios])

  const filtrados = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    if (!termino) return usuarios
    return usuarios.filter((usuario) => {
      const texto = normalizarTexto(
        [
          usuario.nombres,
          usuario.apellidos,
          usuario.usuario,
          usuario.email,
          usuario.residencia,
        ].join(' '),
      )
      return texto.includes(termino)
    })
  }, [usuarios, busqueda])

  const unicoAdmin = conteo.admin <= 1

  async function cambiarRol(usuario, nuevoRol) {
    if (nuevoRol === rolDe(usuario) || guardando) return

    setGuardando(usuario.usuario)
    try {
      const actualizado = await updateUserRole(usuario.usuario, nuevoRol)
      setUsuarios((current) =>
        current.map((item) =>
          item.usuario === usuario.usuario ? { ...item, ...actualizado } : item,
        ),
      )
      toast.success(
        `@${usuario.usuario} ahora es ${ROL_INFO[nuevoRol].etiqueta.toLowerCase()}.`,
      )
      if (user?.usuario === usuario.usuario) {
        await refreshUser()
      }
    } catch (cambioError) {
      toast.error(cambioError.message)
    } finally {
      setGuardando(null)
    }
  }

  const hayBusqueda = busqueda.trim() !== ''

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Usuarios
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            La primera cuenta registrada nace como administradora. Desde aquí
            puedes asignar el rol de cada persona y asegurarte de que siempre
            quede alguien al mando.
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-300"
        >
          <ShieldCheck className="size-3.5" />
          Solo administración
        </Badge>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          etiqueta="Cuentas totales"
          valor={conteo.cliente + conteo.empleado + conteo.admin}
          tono="border-border bg-muted/40 text-foreground"
        />
        <StatCard
          icon={UserCog}
          etiqueta="Clientes"
          valor={conteo.cliente}
          tono={ROL_INFO.cliente.clase}
        />
        <StatCard
          icon={UserCog}
          etiqueta="Empleados"
          valor={conteo.empleado}
          tono={ROL_INFO.empleado.clase}
        />
        <StatCard
          icon={Crown}
          etiqueta="Administradores"
          valor={conteo.admin}
          tono={ROL_INFO.admin.clase}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Listado de cuentas</h2>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {loading
                ? 'Cargando usuarios…'
                : hayBusqueda
                  ? `${filtrados.length} de ${usuarios.length} coincidencias`
                  : `${usuarios.length} ${usuarios.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}`}
            </p>
          </div>

          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Filtrar usuarios por nombre</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o usuario"
              className="pl-9 pr-9"
            />
            {hayBusqueda && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </label>
        </div>

        {error ? (
          <div className="px-4 py-6">
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>No se pudieron cargar los usuarios: {error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cargar}
                  className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
                >
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : loading ? (
          <UsersSkeleton />
        ) : filtrados.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
              <Search className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold">Sin coincidencias</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
              No encontramos cuentas para «{busqueda.trim()}». Prueba con otro
              nombre o nombre de usuario.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBusqueda('')}
              className="mt-4"
            >
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          <ul>
            {filtrados.map((usuario) => {
              const rol = rolDe(usuario)
              const info = ROL_INFO[rol]
              const esUnoMismo = user?.usuario === usuario.usuario
              const bloqueado =
                guardando === usuario.usuario || (rol === 'admin' && unicoAdmin)

              return (
                <li
                  key={usuario.usuario}
                  className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 first:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                        info.clase,
                      )}
                    >
                      {iniciales(usuario)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {nombreVisible(usuario)}
                        </p>
                        {usuario.fundador && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-highlight/40 bg-highlight/10 text-highlight"
                          >
                            <Crown className="size-2.5" />
                            Fundador
                          </Badge>
                        )}
                        {esUnoMismo && (
                          <Badge variant="muted" className="text-[10px]">
                            Tú
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{usuario.usuario}
                        {usuario.email ? ` · ${usuario.email}` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {usuario.residencia || 'Sin residencia'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {formatearFecha(usuario.creado)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ReceiptText className="size-3" />
                          {usuario.facturas}{' '}
                          {usuario.facturas === 1 ? 'factura' : 'facturas'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                    <div className="relative">
                      <select
                        value={rol}
                        onChange={(event) =>
                          cambiarRol(usuario, event.target.value)
                        }
                        disabled={bloqueado}
                        aria-label={`Rol de @${usuario.usuario}`}
                        title={
                          rol === 'admin' && unicoAdmin
                            ? 'Debe quedar al menos un administrador.'
                            : info.descripcion
                        }
                        className="h-8 w-36 appearance-none rounded-md border border-border bg-background pl-2.5 pr-8 text-xs font-medium text-foreground outline-none transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ROLES.map((opcion) => (
                          <option key={opcion} value={opcion}>
                            {ROL_INFO[opcion].etiqueta}
                          </option>
                        ))}
                      </select>
                      {guardando === usuario.usuario ? (
                        <LoaderCircle className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {unicoAdmin && conteo.admin === 1 && (
        <p className="text-xs text-muted-foreground">
          Hay un solo administrador: su rol queda bloqueado para no dejar la
          aplicación sin acceso a la administración.
        </p>
      )}
    </div>
  )
}
