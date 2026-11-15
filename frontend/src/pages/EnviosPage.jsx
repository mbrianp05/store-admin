import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { createEnvio, getEnvios, updateEnvioEstado } from '../api'
import { useAppState } from '../app-context'
import { formatCurrency } from '../lib/format'
import { normalizarTexto } from '../lib/text'
import Pagination from '../components/Pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const POR_PAGINA = 8

const ESTADOS_ENVIO = {
  completada: {
    etiqueta: 'Completada',
    clase: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
  en_progreso: {
    etiqueta: 'En progreso',
    clase: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  },
  cancelado: {
    etiqueta: 'Cancelado',
    clase: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
}

function estadoEnvio(envio) {
  if (envio.estado === 'cancelado') return 'cancelado'
  const facturas = envio.facturas || []
  const completada =
    facturas.length > 0 &&
    facturas.every(
      (factura) =>
        factura.estado === 'pagada' || factura.estado === 'cancelada',
    )
  return completada ? 'completada' : 'en_progreso'
}

const fechaFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function formatearFecha(valor) {
  if (!valor) return 'Sin fecha'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10)
  return fechaFormatter.format(fecha)
}

function direccionFactura(factura) {
  return (
    [factura.envio?.direccion, factura.envio?.ubicacion]
      .filter(Boolean)
      .join(' · ') || 'Sin dirección registrada'
  )
}

function CostoEnvioEditor({ costo, onSave }) {
  const [valor, setValor] = useState(String(costo ?? 0))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const numero = Number(String(valor).replace(',', '.'))
  const valido = Number.isFinite(numero) && numero >= 0
  const redondeado = valido ? Math.round(numero * 100) / 100 : NaN
  const cambio = valido && redondeado !== Number(costo ?? 0)

  async function guardar(event) {
    event.preventDefault()
    if (!valido) {
      setError('Ingresa un monto válido, mayor o igual a cero.')
      return
    }
    setError('')
    setGuardando(true)
    const ok = await onSave(redondeado)
    setGuardando(false)
    if (ok !== false) setValor(String(redondeado))
  }

  return (
    <form onSubmit={guardar} className="flex flex-wrap items-end gap-2">
      <label htmlFor="costo-envio" className="block">
        <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Costo de envío
        </span>
        <div className="relative">
          <Input
            id="costo-envio"
            inputMode="decimal"
            value={valor}
            onChange={(event) => {
              setValor(event.target.value)
              setError('')
            }}
            aria-invalid={error ? true : undefined}
            className="h-8 w-32 pr-7 text-sm tabular-nums"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
        </div>
      </label>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={!cambio || guardando}
        className="h-8"
      >
        {guardando ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        Guardar
      </Button>
      {error && (
        <p className="w-full text-[11px] text-destructive">{error}</p>
      )}
    </form>
  )
}

function EstadoEnvioBadge({ estado }) {
  const info = ESTADOS_ENVIO[estado] || ESTADOS_ENVIO.en_progreso
  return (
    <Badge variant="outline" className={info.clase}>
      {info.etiqueta}
    </Badge>
  )
}

function EnviosSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-72" />
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  )
}

export default function EnviosPage() {
  const { config, onUpdateConfig, onRefreshInvoices } = useAppState()
  const [datos, setDatos] = useState({
    envios: [],
    facturas_disponibles: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState([])
  const [notas, setNotas] = useState('')
  const [paginaDisponibles, setPaginaDisponibles] = useState(1)
  const [paginaEnvios, setPaginaEnvios] = useState(1)
  const [creando, setCreando] = useState(false)
  const [accion, setAccion] = useState(null)

  const cargar = useCallback(async () => {
    try {
      const data = await getEnvios()
      setDatos(data)
      setError(null)
      const disponibles = new Set(
        data.facturas_disponibles.map((factura) => factura.codigo),
      )
      setSeleccion((actual) =>
        actual.filter((codigo) => disponibles.has(codigo)),
      )
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga inicial desde la API
    cargar()
  }, [cargar])

  const disponiblesFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    return datos.facturas_disponibles
      .filter((factura) => {
        if (!termino) return true
        const texto = [
          factura.numero,
          factura.usuario,
          factura.envio?.direccion,
          factura.envio?.ubicacion,
          ...factura.items.map((item) => item.producto?.nombre),
        ]
          .filter(Boolean)
          .join(' ')
        return normalizarTexto(texto).includes(termino)
      })
      .sort((a, b) => b.numero - a.numero)
  }, [datos.facturas_disponibles, busqueda])

  const totalPaginasDisponibles = Math.max(
    1,
    Math.ceil(disponiblesFiltradas.length / POR_PAGINA),
  )
  const paginaDisponiblesActual = Math.min(
    paginaDisponibles,
    totalPaginasDisponibles,
  )
  const inicioDisponibles = (paginaDisponiblesActual - 1) * POR_PAGINA
  const disponiblesVisibles = disponiblesFiltradas.slice(
    inicioDisponibles,
    inicioDisponibles + POR_PAGINA,
  )

  const totalPaginasEnvios = Math.max(
    1,
    Math.ceil(datos.envios.length / POR_PAGINA),
  )
  const paginaEnviosActual = Math.min(paginaEnvios, totalPaginasEnvios)
  const inicioEnvios = (paginaEnviosActual - 1) * POR_PAGINA
  const enviosVisibles = datos.envios.slice(
    inicioEnvios,
    inicioEnvios + POR_PAGINA,
  )

  const seleccionadas = useMemo(
    () =>
      datos.facturas_disponibles.filter((factura) =>
        seleccion.includes(factura.codigo),
      ),
    [datos.facturas_disponibles, seleccion],
  )
  const totalSeleccionado = seleccionadas.reduce(
    (total, factura) => total + (Number(factura.total) || 0),
    0,
  )
  const todasVisiblesSeleccionadas =
    disponiblesVisibles.length > 0 &&
    disponiblesVisibles.every((factura) => seleccion.includes(factura.codigo))

  const enviosActivos = datos.envios.filter(
    (envio) => estadoEnvio(envio) === 'en_progreso',
  )
  const facturasEnEnvio = enviosActivos.reduce(
    (total, envio) => total + envio.cantidad_facturas,
    0,
  )
  const completados = datos.envios.filter(
    (envio) => estadoEnvio(envio) === 'completada',
  ).length
  const totalPorEnviar = datos.facturas_disponibles.reduce(
    (total, factura) => total + (Number(factura.total) || 0),
    0,
  )

  function alternarFactura(codigo) {
    setSeleccion((actual) =>
      actual.includes(codigo)
        ? actual.filter((item) => item !== codigo)
        : [...actual, codigo],
    )
  }

  function alternarVisibles() {
    const codigos = disponiblesVisibles.map((factura) => factura.codigo)
    setSeleccion((actual) => {
      if (todasVisiblesSeleccionadas) {
        return actual.filter((codigo) => !codigos.includes(codigo))
      }
      return [...new Set([...actual, ...codigos])]
    })
  }

  async function agrupar() {
    if (seleccion.length === 0 || creando) return
    setCreando(true)
    const cantidad = seleccion.length
    try {
      await createEnvio(seleccion, notas.trim())
      setSeleccion([])
      setNotas('')
      await Promise.all([cargar(), onRefreshInvoices?.()])
      toast.success(
        cantidad === 1
          ? 'Se creó un envío con la factura seleccionada.'
          : `Se agruparon ${cantidad} facturas en un solo envío.`,
      )
    } catch (createError) {
      toast.error(createError.message)
      await cargar()
    } finally {
      setCreando(false)
    }
  }

  async function cambiarEstadoEnvio(envio, estado) {
    if (accion) return
    setAccion(envio.id)
    try {
      await updateEnvioEstado(envio.id, estado)
      await Promise.all([cargar(), onRefreshInvoices?.()])
      toast.success(
        estado === 'entregado'
          ? `${envio.codigo}: envío entregado y facturas cobradas.`
          : `${envio.codigo}: envío cancelado y facturas devueltas a pendiente.`,
      )
    } catch (actionError) {
      toast.error(actionError.message)
    } finally {
      setAccion(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Envíos
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Agrupa facturas a domicilio en un envío único; al agruparlas pasan
            automáticamente a estado «En envío».
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <CostoEnvioEditor
            key={`costo-${config.costo_envio}`}
            costo={Number(config.costo_envio) || 0}
            onSave={onUpdateConfig}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              cargar()
            }}
            disabled={loading}
            className="h-8"
            aria-label="Actualizar envíos"
            title="Actualizar envíos"
          >
            {loading ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Actualizar
          </Button>
        </div>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>No se pudieron cargar los envíos: {error}</p>
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
      ) : loading ? (
        <EnviosSkeleton />
      ) : (
        <>
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div className="flex items-baseline gap-1.5">
              <dd className="text-lg font-semibold tabular-nums">
                {enviosActivos.length}
              </dd>
              <dt className="text-xs text-muted-foreground">envíos activos</dt>
              <span className="text-xs text-muted-foreground">
                · {facturasEnEnvio}{' '}
                {facturasEnEnvio === 1 ? 'factura en ruta' : 'facturas en ruta'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dd className="text-lg font-semibold tabular-nums">
                {datos.facturas_disponibles.length}
              </dd>
              <dt className="text-xs text-muted-foreground">
                facturas por agrupar
              </dt>
              {datos.facturas_disponibles.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {formatCurrency(totalPorEnviar)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <dd className="text-lg font-semibold tabular-nums">
                {completados}
              </dd>
              <dt className="text-xs text-muted-foreground">completados</dt>
            </div>
          </dl>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <section
                className="min-w-0 border-b border-border xl:border-b-0 xl:border-r"
                aria-label="Facturas por agrupar"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">
                      Facturas por agrupar
                    </h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      A domicilio, sin envío asignado y sin cobrar
                    </p>
                  </div>
                  <div className="relative w-full sm:w-60">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={busqueda}
                      onChange={(event) => {
                        setBusqueda(event.target.value)
                        setPaginaDisponibles(1)
                      }}
                      placeholder="Cliente, dirección o factura"
                      className="h-8 bg-background/50 pl-8 text-xs"
                      aria-label="Buscar facturas disponibles"
                    />
                    {busqueda && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusqueda('')
                          setPaginaDisponibles(1)
                        }}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {seleccion.length > 0 && (
                  <div className="space-y-2 border-b border-border bg-highlight/[0.05] px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {seleccion.length}
                        </span>{' '}
                        {seleccion.length === 1
                          ? 'factura seleccionada'
                          : 'facturas seleccionadas'}{' '}
                        · {formatCurrency(totalSeleccionado)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSeleccion([])}
                          className="h-8 text-[11px] text-muted-foreground"
                        >
                          Limpiar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={agrupar}
                          disabled={creando}
                        >
                          {creando ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Truck className="size-3.5" />
                          )}
                          Agrupar en un envío
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={notas}
                      onChange={(event) => setNotas(event.target.value)}
                      placeholder="Notas del envío (opcional)"
                      maxLength={300}
                      className="h-8 bg-background/50 text-xs"
                    />
                  </div>
                )}

                {disponiblesFiltradas.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <Truck className="mx-auto size-6 text-muted-foreground" />
                    <h2 className="mt-3 text-base font-semibold">
                      {datos.facturas_disponibles.length === 0
                        ? 'No hay facturas por agrupar'
                        : 'Ninguna factura coincide'}
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
                      {datos.facturas_disponibles.length === 0
                        ? 'Las facturas a domicilio pendientes aparecerán aquí para crear un envío.'
                        : 'Prueba con otro cliente, otra dirección u otro número de factura.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        {disponiblesFiltradas.length}{' '}
                        {disponiblesFiltradas.length === 1
                          ? 'factura'
                          : 'facturas'}{' '}
                        disponibles
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={alternarVisibles}
                        className="h-7 px-2 text-[11px] text-muted-foreground"
                      >
                        {todasVisiblesSeleccionadas
                          ? 'Quitar visibles'
                          : 'Seleccionar visibles'}
                      </Button>
                    </div>
                    <Pagination
                      pagina={paginaDisponiblesActual}
                      totalPaginas={totalPaginasDisponibles}
                      total={disponiblesFiltradas.length}
                      desde={inicioDisponibles + 1}
                      hasta={inicioDisponibles + disponiblesVisibles.length}
                      onCambio={setPaginaDisponibles}
                      etiqueta="facturas disponibles"
                      className="border-t-0 border-b"
                    />
                    <ul className="divide-y divide-border">
                      {disponiblesVisibles.map((factura) => {
                        const activa = seleccion.includes(factura.codigo)
                        const articulos = factura.items.reduce(
                          (total, item) => total + item.cantidad,
                          0,
                        )
                        return (
                          <li key={factura.codigo}>
                            <button
                              type="button"
                              aria-pressed={activa}
                              onClick={() => alternarFactura(factura.codigo)}
                              className={cn(
                                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                activa
                                  ? 'bg-highlight/[0.07]'
                                  : 'hover:bg-muted/40',
                              )}
                            >
                              <span
                                className={cn(
                                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors',
                                  activa
                                    ? 'border-highlight bg-highlight text-background'
                                    : 'border-border bg-background text-transparent',
                                )}
                              >
                                <Check className="size-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="text-sm font-semibold tabular-nums">
                                    #{factura.numero}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    @{factura.usuario || 'cliente'}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatearFecha(factura.fecha)}
                                  </span>
                                </span>
                                <span className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
                                  <MapPin className="mt-0.5 size-3 shrink-0" />
                                  <span className="line-clamp-2">
                                    {direccionFactura(factura)}
                                  </span>
                                </span>
                                <span className="mt-1 block text-[10px] text-muted-foreground">
                                  {articulos}{' '}
                                  {articulos === 1 ? 'artículo' : 'artículos'}
                                  {factura.estado === 'en_envio'
                                    ? ' · ya marcada en envío'
                                    : ''}
                                </span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums">
                                {formatCurrency(factura.total)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>

              <section className="min-w-0" aria-label="Envíos agrupados">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Envíos agrupados</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {datos.envios.length}{' '}
                    {datos.envios.length === 1
                      ? 'envío creado'
                      : 'envíos creados'}
                  </p>
                </div>

                {datos.envios.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <Truck className="mx-auto size-6 text-muted-foreground" />
                    <h2 className="mt-3 text-base font-semibold">
                      Aún no hay envíos
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                      Selecciona facturas a domicilio y agrúpalas para crear el
                      primer envío.
                    </p>
                  </div>
                ) : (
                  <>
                    <Pagination
                      pagina={paginaEnviosActual}
                      totalPaginas={totalPaginasEnvios}
                      total={datos.envios.length}
                      desde={inicioEnvios + 1}
                      hasta={inicioEnvios + enviosVisibles.length}
                      onCambio={setPaginaEnvios}
                      etiqueta="envíos"
                      className="border-t-0 border-b"
                    />
                    <ul className="divide-y divide-border">
                      {enviosVisibles.map((envio) => {
                        const ocupado = accion === envio.id
                        return (
                          <li key={envio.id} className="space-y-2 px-4 py-3.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold tracking-tight">
                                  {envio.codigo}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {formatearFecha(envio.fecha)}
                                  {envio.creado_por
                                    ? ` · por @${envio.creado_por}`
                                    : ''}
                                </p>
                              </div>
                              <EstadoEnvioBadge estado={estadoEnvio(envio)} />
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                              {envio.cantidad_facturas}{' '}
                              {envio.cantidad_facturas === 1
                                ? 'factura'
                                : 'facturas'}{' '}
                              ·{' '}
                              <span className="font-medium text-foreground">
                                {formatCurrency(envio.total)}
                              </span>
                            </p>

                            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-snug text-muted-foreground">
                              {envio.facturas.map((factura, indice) => (
                                <span
                                  key={factura.codigo}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  {indice > 0 && (
                                    <span aria-hidden="true">·</span>
                                  )}
                                  <Link
                                    to="/facturas"
                                    search={{ factura: factura.codigo }}
                                    title={`Ver la factura #${factura.numero} en Facturas`}
                                    className={cn(
                                      'rounded-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                      factura.estado === 'pagada' ||
                                        factura.estado === 'cancelada'
                                        ? 'text-muted-foreground line-through decoration-muted-foreground/70'
                                        : 'text-foreground/90 hover:text-foreground',
                                    )}
                                  >
                                    #{factura.numero} @
                                    {factura.usuario || 'cliente'}
                                  </Link>
                                </span>
                              ))}
                            </p>

                            {envio.destinos.length > 0 && (
                              <p className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
                                <MapPin className="mt-0.5 size-3 shrink-0" />
                                <span>
                                  {envio.destinos.slice(0, 2).join(' / ')}
                                  {envio.destinos.length > 2
                                    ? ` +${envio.destinos.length - 2} destinos`
                                    : ''}
                                </span>
                              </p>
                            )}

                            {envio.notas && (
                              <p className="text-[11px] leading-snug text-foreground/80">
                                <span className="text-muted-foreground">
                                  Notas:{' '}
                                </span>
                                {envio.notas}
                              </p>
                            )}

                            {envio.estado === 'en_envio' && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    cambiarEstadoEnvio(envio, 'cancelado')
                                  }
                                  disabled={ocupado}
                                  className="h-7 px-2 text-[11px] text-muted-foreground"
                                >
                                  {ocupado ? (
                                    <LoaderCircle className="size-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="size-3" />
                                  )}
                                  Cancelar envío
                                </Button>
                                <span className="text-[10px] text-muted-foreground">
                                  Abre una factura para cambiar su estado.
                                </span>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
