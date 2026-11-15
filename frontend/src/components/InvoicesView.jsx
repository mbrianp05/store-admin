import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  MapPin,
  ReceiptText,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/format'
import { precioVigente } from '../lib/pricing'
import { normalizarTexto } from '../lib/text'
import DateRangePicker from './DateRangePicker'
import InvoiceQR from './InvoiceQR'
import Pagination from './Pagination'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ESTADOS = [
  {
    valor: 'pendiente',
    etiqueta: 'Pendiente',
    clase: 'border-highlight/40 bg-highlight/15 text-highlight',
  },
  {
    valor: 'en_envio',
    etiqueta: 'En envío',
    clase: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  },
  {
    valor: 'pagada',
    etiqueta: 'Pagada',
    clase: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
  {
    valor: 'cancelada',
    etiqueta: 'Cancelada',
    clase: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
]

function estadoInfo(valor) {
  return ESTADOS.find((estado) => estado.valor === valor) || ESTADOS[0]
}

function claveFactura(invoice) {
  return `${invoice.usuario || ''}-${invoice.numero}`
}

function EstadoBadge({ estado }) {
  const info = estadoInfo(estado)
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        info.clase,
      )}
    >
      {info.etiqueta}
    </span>
  )
}

function EstadoSelector({ estado, onChange, aDomicilio = false }) {
  const [guardando, setGuardando] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const opciones = aDomicilio
    ? ESTADOS
    : ESTADOS.filter((opcion) => opcion.valor !== 'en_envio')

  async function elegir(valor) {
    if (valor === estado || guardando) return
    if (valor === 'cancelada') {
      setCancelando(true)
      return
    }
    setGuardando(valor)
    await onChange(valor)
    setGuardando(null)
  }

  async function confirmarCancelacion() {
    setGuardando('cancelada')
    const ok = await onChange('cancelada', motivo.trim())
    setGuardando(null)
    if (ok !== false) {
      setCancelando(false)
      setMotivo('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Estado de la factura">
        {opciones.map((opcion) => {
          const activo = opcion.valor === estado
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activo}
              disabled={Boolean(guardando)}
              onClick={() => elegir(opcion.valor)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60',
                activo
                  ? opcion.clase
                  : 'border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {activo && <Check className="size-3" />}
              {opcion.etiqueta}
            </button>
          )
        })}
      </div>

      {cancelando && (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
          <p className="text-[11px] font-medium text-destructive">
            Motivo de la cancelación{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </p>
          <Input
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ej.: el cliente no retiró el pedido"
            maxLength={300}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmarCancelacion}
              disabled={guardando === 'cancelada'}
            >
              {guardando === 'cancelada' ? 'Cancelando…' : 'Confirmar cancelación'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelando(false)
                setMotivo('')
              }}
              disabled={guardando === 'cancelada'}
            >
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <Skeleton key={index} className="h-[126px] rounded-xl" />
      ))}
    </div>
  )
}

function EntregaInfo({ envio, costo, cancelada = false }) {
  const aDomicilio = Boolean(envio?.a_domicilio)

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
        {aDomicilio ? (
          <Truck className="size-3.5" />
        ) : (
          <ReceiptText className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Entrega
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {aDomicilio ? 'Envío a domicilio' : 'Retiro en mostrador'}
        </p>
        <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-muted-foreground">
          {aDomicilio && (
            <MapPin className="mt-0.5 size-3 shrink-0" />
          )}
          <span>
            {aDomicilio
              ? envio.direccion || envio.ubicacion || 'Dirección no indicada'
              : 'El cliente retira el pedido en el local.'}
          </span>
        </p>
      </div>
      {aDomicilio && (
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground">Costo</p>
          <p
            className={cn(
              'text-sm font-semibold tabular-nums text-foreground',
              cancelada && 'text-muted-foreground line-through opacity-70',
            )}
          >
            {formatCurrency(costo)}
          </p>
        </div>
      )}
    </div>
  )
}

function InvoiceDetail({ invoice, onBack, onUpdateState, canUpdateState }) {
  const itemCount = invoice.items.reduce((total, item) => total + item.cantidad, 0)
  const cancelada = invoice.estado === 'cancelada'

  return (
    <Card
      key={claveFactura(invoice)}
      className="animate-in fade-in slide-in-from-bottom-2 gap-0 overflow-hidden py-0 duration-200"
    >
      <header className="border-b border-border px-5 py-5 sm:px-7">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 mb-4 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a facturas
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">Factura emitida</p>
              <EstadoBadge estado={invoice.estado} />
            </div>
            <p className="mt-1.5 text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
              #{invoice.numero}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Fecha</p>
            <p className="mt-1.5 text-sm font-medium">{formatDate(invoice.fecha)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </p>
            {invoice.usuario && (
              <p className="mt-1 text-xs text-muted-foreground">@{invoice.usuario}</p>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 py-4 sm:px-7 sm:py-5">
        <table className="w-full text-left">
          <caption className="sr-only">Detalle de la factura {invoice.numero}</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-medium">
                Producto
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Cantidad
              </th>
              <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">
                Unitario
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const precioUnitario = precioVigente(item.producto, invoice.fecha)
              return (
                <tr key={`${item.producto.nombre}-${index}`} className="border-t border-border/70">
                  <td className="py-3 pr-3 text-sm leading-snug text-foreground">
                    {item.producto.nombre}
                  </td>
                  <td className="whitespace-nowrap py-3 text-right text-sm tabular-nums text-muted-foreground">
                    {item.cantidad}
                  </td>
                  <td className="hidden whitespace-nowrap py-3 text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                    <span className={cn(cancelada && 'line-through opacity-60')}>
                      {formatCurrency(precioUnitario)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 text-right text-sm font-medium tabular-nums">
                    <span className={cn(cancelada && 'text-muted-foreground line-through opacity-70')}>
                      {formatCurrency(precioUnitario * item.cantidad)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 border-t border-border px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
        <div className="space-y-5">
          {invoice.estado === 'cancelada' && (
            <div className="border-l-2 border-destructive/60 pl-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                Factura cancelada
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {invoice.motivo_cancelacion || 'Sin motivo especificado'}
              </p>
            </div>
          )}

          <EntregaInfo
            envio={invoice.envio}
            costo={invoice.costo_envio}
            cancelada={cancelada}
          />

          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Estado del pedido
            </p>
            {canUpdateState ? (
              <div className="mt-2">
                <EstadoSelector
                  estado={invoice.estado}
                  aDomicilio={Boolean(invoice.envio?.a_domicilio)}
                  onChange={(estado, motivo) =>
                    onUpdateState(invoice.numero, estado, motivo, invoice.usuario)
                  }
                />
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <EstadoBadge estado={invoice.estado} />
                <span className="text-xs text-muted-foreground">
                  Solo lectura · un empleado o administrador puede cambiarlo
                </span>
              </div>
            )}
          </div>
        </div>

        {invoice.envio?.a_domicilio && (
          <div className="flex flex-col items-center gap-2 sm:justify-self-end">
            <InvoiceQR
              value={invoice.qr}
              codigo={invoice.codigo}
              anulado={cancelada}
            />
            {cancelada && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                QR anulado
              </span>
            )}
            <p className="max-w-[13rem] text-center text-[11px] leading-snug text-muted-foreground">
              {cancelada
                ? 'La factura está cancelada: el QR ya no sirve para verificar la entrega.'
                : 'Comparte este QR con quien entrega el producto.'}
            </p>
          </div>
        )}
      </div>

      <footer className="space-y-1.5 border-t border-border px-5 py-4 sm:px-7">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Productos</span>
          <span
            className={cn(
              'tabular-nums',
              cancelada && 'text-muted-foreground line-through opacity-70',
            )}
          >
            {formatCurrency(invoice.subtotal ?? invoice.total)}
          </span>
        </div>
        {invoice.envio?.a_domicilio && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span
              className={cn(
                'tabular-nums',
                cancelada && 'text-muted-foreground line-through opacity-70',
              )}
            >
              {formatCurrency(invoice.costo_envio)}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/70 pt-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            Total
            {cancelada && (
              <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                Sin cobro
              </span>
            )}
          </span>
          <span
            className={cn(
              'text-xl font-semibold tabular-nums leading-none tracking-tight',
              cancelada && 'text-muted-foreground line-through opacity-70',
            )}
          >
            {formatCurrency(invoice.total)}
          </span>
        </div>
      </footer>
    </Card>
  )
}

const PERIODO_VACIO = { desde: null, hasta: null }
const FACTURAS_POR_PAGINA = 9

function FiltrosFacturas({
  busqueda,
  onBusqueda,
  periodo,
  onPeriodo,
  subtotalMin,
  onSubtotalMin,
  activos,
  onLimpiar,
}) {
  return (
    <section className="border-b border-border pb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Filtrar facturas</h2>
        {activos && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLimpiar}
            className="-my-1 h-7 px-2 text-[11px] text-muted-foreground"
          >
            <X className="size-3.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="facturas-producto" className="text-[11px] text-ink-soft">
            Producto
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="facturas-producto"
              value={busqueda}
              onChange={(event) => onBusqueda(event.target.value)}
              placeholder="Buscar por producto"
              className="bg-background/50 pl-8"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="facturas-periodo" className="text-[11px] text-ink-soft">
            Rango de fechas
          </Label>
          <DateRangePicker
            id="facturas-periodo"
            desde={periodo.desde}
            hasta={periodo.hasta}
            onChange={onPeriodo}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="facturas-subtotal-min" className="text-[11px] text-ink-soft">
            Subtotal mínimo
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              id="facturas-subtotal-min"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={subtotalMin}
              onChange={(event) => onSubtotalMin(event.target.value)}
              placeholder="Sin mínimo"
              className="bg-background/50 pl-7"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function InvoicesView({
  invoices,
  loading,
  selectedInvoice,
  onSelect,
  onClearSelection,
  onUpdateState,
  canUpdateState = false,
  showOwner = false,
  usuarioActual = '',
}) {
  const [busqueda, setBusqueda] = useState('')
  const [periodo, setPeriodo] = useState(PERIODO_VACIO)
  const [subtotalMin, setSubtotalMin] = useState('')
  const [pagina, setPagina] = useState(1)
  const [alcance, setAlcance] = useState('todas')

  const puedeAlternarAlcance = showOwner && Boolean(usuarioActual)
  const facturasBase = useMemo(() => {
    if (!puedeAlternarAlcance || alcance === 'todas') return invoices
    const objetivo = String(usuarioActual).toLocaleLowerCase('es')
    return invoices.filter(
      (invoice) =>
        String(invoice.usuario || '').toLocaleLowerCase('es') === objetivo,
    )
  }, [invoices, alcance, puedeAlternarAlcance, usuarioActual])

  const filtrosActivos =
    busqueda.trim() !== '' ||
    Boolean(periodo.desde || periodo.hasta) ||
    subtotalMin.trim() !== ''

  const ordenCreacion = useMemo(() => {
    const mapa = new Map()
    invoices.forEach((invoice, indice) => {
      mapa.set(claveFactura(invoice), indice)
    })
    return mapa
  }, [invoices])

  const sorted = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    const minimo = subtotalMin.trim() === '' ? null : Number(subtotalMin)

    return facturasBase
      .filter((invoice) => {
        if (termino) {
          const coincide = invoice.items.some((item) =>
            normalizarTexto(item.producto?.nombre).includes(termino),
          )
          if (!coincide) return false
        }

        const fecha = String(invoice.fecha || '').slice(0, 10)
        if (periodo.desde && fecha < periodo.desde) return false
        if (periodo.hasta && fecha > periodo.hasta) return false

        const subtotal = Number(invoice.subtotal ?? invoice.total) || 0
        if (minimo !== null && !Number.isNaN(minimo) && subtotal < minimo) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        const fechaA = String(a.fecha || '').slice(0, 10)
        const fechaB = String(b.fecha || '').slice(0, 10)
        if (fechaA !== fechaB) return fechaB.localeCompare(fechaA)
        // La numeración es por usuario: dentro del mismo día manda el orden
        // de creación real, no el número de factura.
        const posicionA = ordenCreacion.get(claveFactura(a)) ?? -1
        const posicionB = ordenCreacion.get(claveFactura(b)) ?? -1
        return posicionB - posicionA
      })
  }, [facturasBase, busqueda, periodo, subtotalMin, ordenCreacion])

  const totalFiltrado = sorted.reduce(
    (total, invoice) =>
      invoice.estado === 'cancelada' ? total : total + (Number(invoice.total) || 0),
    0,
  )
  const canceladasFiltradas = sorted.filter(
    (invoice) => invoice.estado === 'cancelada',
  ).length

  const totalPaginas = Math.max(
    1,
    Math.ceil(sorted.length / FACTURAS_POR_PAGINA),
  )
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicioPagina = (paginaActual - 1) * FACTURAS_POR_PAGINA
  const visibles = sorted.slice(
    inicioPagina,
    inicioPagina + FACTURAS_POR_PAGINA,
  )

  function limpiarFiltros() {
    setBusqueda('')
    setPeriodo(PERIODO_VACIO)
    setSubtotalMin('')
    setPagina(1)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Facturas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {facturasBase.length === 0
              ? alcance === 'mias'
                ? 'Todavía no emitiste ninguna factura.'
                : 'Todavía no se emitió ninguna factura.'
              : `${facturasBase.length} ${
                  facturasBase.length === 1 ? 'factura' : 'facturas'
                } ${alcance === 'mias' ? 'tuyas' : 'emitidas'}`}
          </p>
        </div>

        {puedeAlternarAlcance && (
          <div
            role="group"
            aria-label="Alcance de las facturas"
            className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
          >
            {[
              { valor: 'todas', etiqueta: 'Todas', total: invoices.length },
              {
                valor: 'mias',
                etiqueta: 'Mías',
                total: invoices.filter(
                  (invoice) =>
                    String(invoice.usuario || '').toLocaleLowerCase('es') ===
                    String(usuarioActual).toLocaleLowerCase('es'),
                ).length,
              },
            ].map((opcion) => {
              const activo = alcance === opcion.valor
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setAlcance(opcion.valor)
                    setPagina(1)
                    onClearSelection?.()
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    activo
                      ? 'bg-secondary text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opcion.etiqueta}
                  <span className="tabular-nums text-[11px] text-muted-foreground">
                    {opcion.total}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <FiltrosFacturas
        busqueda={busqueda}
        onBusqueda={(valor) => {
          setBusqueda(valor)
          setPagina(1)
        }}
        periodo={periodo}
        onPeriodo={(valor) => {
          setPeriodo({ desde: valor.desde || null, hasta: valor.hasta || null })
          setPagina(1)
        }}
        subtotalMin={subtotalMin}
        onSubtotalMin={(valor) => {
          setSubtotalMin(valor)
          setPagina(1)
        }}
        activos={filtrosActivos}
        onLimpiar={limpiarFiltros}
      />

      {selectedInvoice ? (
        <InvoiceDetail
          invoice={selectedInvoice}
          onBack={onClearSelection}
          onUpdateState={onUpdateState}
          canUpdateState={canUpdateState}
        />
      ) : (
        <section aria-label="Facturas emitidas" className="space-y-4">
          {!loading && sorted.length > 0 && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {filtrosActivos
                    ? `${sorted.length} de ${facturasBase.length}`
                    : sorted.length}{' '}
                  {sorted.length === 1 ? 'factura' : 'facturas'}
                </p>
                {canceladasFiltradas > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    No incluye {canceladasFiltradas}{' '}
                    {canceladasFiltradas === 1 ? 'cancelada' : 'canceladas'}.
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground">
                  {filtrosActivos ? 'Total filtrado' : 'Total facturado'}
                </p>
                <p className="text-lg font-semibold leading-tight tracking-tight tabular-nums">
                  {formatCurrency(totalFiltrado)}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <InvoiceListSkeleton />
          ) : sorted.length === 0 ? (
            <div className="py-14 text-center">
              {facturasBase.length === 0 ? (
                <ReceiptText className="mx-auto size-6 text-muted-foreground" />
              ) : (
                <Search className="mx-auto size-6 text-muted-foreground" />
              )}
              <h2 className="mt-3 text-base font-semibold">
                {facturasBase.length === 0
                  ? 'No hay facturas'
                  : 'Ninguna factura coincide'}
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                {facturasBase.length === 0
                  ? alcance === 'mias'
                    ? 'Cuando emitas una factura desde el carrito la verás aquí.'
                    : 'Agrega productos al carrito y emite la primera factura desde el panel del carrito.'
                  : 'Prueba con otro producto, otro periodo o un subtotal mínimo menor.'}
              </p>
              {facturasBase.length > 0 && filtrosActivos && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <Pagination
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                total={sorted.length}
                desde={inicioPagina + 1}
                hasta={inicioPagina + visibles.length}
                onCambio={setPagina}
                etiqueta="facturas"
                className="border-t-0 border-b"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibles.map((invoice) => {
                  const cancelada = invoice.estado === 'cancelada'
                  const itemCount = invoice.items.reduce(
                    (total, item) => total + item.cantidad,
                    0,
                  )
                  return (
                    <button
                      key={claveFactura(invoice)}
                      type="button"
                      onClick={() => onSelect(invoice)}
                      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/25 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-lg font-semibold leading-none tabular-nums tracking-tight">
                          #{invoice.numero}
                        </span>
                        <EstadoBadge estado={invoice.estado} />
                      </span>

                      <span className="block min-w-0 text-xs leading-relaxed text-muted-foreground">
                        <span className="block">{formatDate(invoice.fecha)}</span>
                        {showOwner && invoice.usuario && (
                          <span className="block truncate">
                            @{invoice.usuario}
                          </span>
                        )}
                      </span>

                      <span className="mt-auto flex items-end justify-between gap-2 border-t border-border/60 pt-3">
                        <span className="text-[11px] text-muted-foreground">
                          {itemCount}{' '}
                          {itemCount === 1 ? 'artículo' : 'artículos'}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums text-foreground',
                            cancelada &&
                              'text-muted-foreground line-through opacity-70',
                          )}
                        >
                          {formatCurrency(invoice.total)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
