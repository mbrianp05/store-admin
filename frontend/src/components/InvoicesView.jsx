import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
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

function EstadoSelector({ estado, onChange }) {
  const [guardando, setGuardando] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')

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
        {ESTADOS.map((opcion) => {
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
    <ul>
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 border-t border-border/70 px-4 py-4 first:border-0"
        >
          <Skeleton className="h-4 w-8" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-16" />
        </li>
      ))}
    </ul>
  )
}

function EntregaInfo({ envio, costo, cancelada = false }) {
  if (envio?.a_domicilio) {
    return (
      <div className="rounded-lg border border-highlight/25 bg-highlight/[0.07] p-3">
        <div className="flex items-center gap-2 text-highlight">
          <Truck className="size-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">Envío a domicilio</p>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span>{envio.direccion || envio.ubicacion || 'Dirección no indicada'}</span>
        </p>
        <p className="mt-2 flex items-baseline justify-between border-t border-highlight/20 pt-2 text-xs text-muted-foreground">
          <span>Costo de envío</span>
          <span
            className={cn(
              'font-semibold tabular-nums text-foreground',
              cancelada && 'text-muted-foreground line-through opacity-70',
            )}
          >
            {formatCurrency(costo)}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-muted/40 text-foreground">
        <ReceiptText className="size-3.5" />
      </span>
      <div>
        <p className="font-medium text-foreground">Retiro en mostrador</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          El cliente retira el pedido en el local.
        </p>
      </div>
    </div>
  )
}

function InvoiceDetail({ invoice, onBack, onUpdateState }) {
  const itemCount = invoice.items.reduce((total, item) => total + item.cantidad, 0)
  const cancelada = invoice.estado === 'cancelada'

  return (
    <Card
      key={invoice.numero}
      className="animate-in fade-in slide-in-from-bottom-2 gap-0 overflow-hidden py-0 duration-200"
    >
      <header className="border-b border-border px-5 py-5 sm:px-7">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 mb-4 text-muted-foreground lg:hidden"
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

      <div className="grid gap-5 border-t border-border px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
        <div className="space-y-4">
          {invoice.estado === 'cancelada' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Factura cancelada
              </p>
              <p className="mt-1 text-sm text-foreground">
                {invoice.motivo_cancelacion || 'Sin motivo especificado'}
              </p>
            </div>
          )}

          {invoice.envio?.a_domicilio && (
            <EntregaInfo
              envio={invoice.envio}
              costo={invoice.costo_envio}
              cancelada={cancelada}
            />
          )}

          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Estado del pedido</h3>
            <div className="mt-2">
              <EstadoSelector
                estado={invoice.estado}
                onChange={(estado, motivo) =>
                  onUpdateState(invoice.numero, estado, motivo)
                }
              />
            </div>
          </div>

          {!invoice.envio?.a_domicilio && (
            <EntregaInfo
              envio={invoice.envio}
              costo={invoice.costo_envio}
              cancelada={cancelada}
            />
          )}
        </div>

        {invoice.envio?.a_domicilio && (
          <div className="flex flex-col items-center gap-2 sm:justify-self-end">
            <InvoiceQR
              value={invoice.qr}
              codigo={invoice.codigo}
              anulado={cancelada}
            />
            {cancelada && (
              <span className="rounded-full border border-zinc-600/60 bg-zinc-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                QR anulado
              </span>
            )}
            <p className="max-w-[14rem] text-center text-[11px] leading-snug text-muted-foreground">
              {cancelada
                ? 'La factura está cancelada: el QR quedó roto y ya no sirve para verificar la entrega.'
                : 'Comparte este QR con quien entrega el producto para verificar la entrega.'}
            </p>
          </div>
        )}
      </div>

      <footer className="space-y-1.5 border-t border-border bg-muted/30 px-5 py-4 sm:px-7">
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
    <Card className="gap-4 px-4 py-4 sm:px-5">
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
    </Card>
  )
}

export default function InvoicesView({
  invoices,
  loading,
  selectedInvoice,
  onSelect,
  onClearSelection,
  onUpdateState,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [periodo, setPeriodo] = useState(PERIODO_VACIO)
  const [subtotalMin, setSubtotalMin] = useState('')

  const filtrosActivos =
    busqueda.trim() !== '' ||
    Boolean(periodo.desde || periodo.hasta) ||
    subtotalMin.trim() !== ''

  const sorted = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    const minimo = subtotalMin.trim() === '' ? null : Number(subtotalMin)

    return invoices
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
      .sort((a, b) => b.numero - a.numero)
  }, [invoices, busqueda, periodo, subtotalMin])

  const totalFiltrado = sorted.reduce(
    (total, invoice) =>
      invoice.estado === 'cancelada' ? total : total + (Number(invoice.total) || 0),
    0,
  )
  const canceladasFiltradas = sorted.filter(
    (invoice) => invoice.estado === 'cancelada',
  ).length

  function limpiarFiltros() {
    setBusqueda('')
    setPeriodo(PERIODO_VACIO)
    setSubtotalMin('')
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Facturas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invoices.length === 0
            ? 'Todavía no se emitió ninguna factura.'
            : `${invoices.length} ${invoices.length === 1 ? 'factura emitida' : 'facturas emitidas'}`}
        </p>
      </header>

      <FiltrosFacturas
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        periodo={periodo}
        onPeriodo={(valor) =>
          setPeriodo({ desde: valor.desde || null, hasta: valor.hasta || null })
        }
        subtotalMin={subtotalMin}
        onSubtotalMin={setSubtotalMin}
        activos={filtrosActivos}
        onLimpiar={limpiarFiltros}
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          className={selectedInvoice ? 'hidden lg:block' : ''}
          aria-label="Facturas emitidas"
        >
          <Card className="gap-0 overflow-hidden py-0">
            {!loading && sorted.length > 0 && (
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-border/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {filtrosActivos
                      ? `${sorted.length} de ${invoices.length}`
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
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                  {invoices.length === 0 ? (
                    <ReceiptText className="size-5" />
                  ) : (
                    <Search className="size-5" />
                  )}
                </span>
                <h2 className="mt-4 text-base font-semibold">
                  {invoices.length === 0
                    ? 'No hay facturas'
                    : 'Ninguna factura coincide'}
                </h2>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                  {invoices.length === 0
                    ? 'Agrega productos al carrito y emite la primera factura desde el panel del carrito.'
                    : 'Prueba con otro producto, otro periodo o un subtotal mínimo menor.'}
                </p>
                {invoices.length > 0 && filtrosActivos && (
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
              <ul className="space-y-1 p-2">
                {sorted.map((invoice) => {
                  const isSelected = selectedInvoice?.numero === invoice.numero
                  const itemCount = invoice.items.reduce(
                    (total, item) => total + item.cantidad,
                    0,
                  )
                  return (
                    <li key={invoice.numero}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onSelect(invoice)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={cn(
                          'h-auto w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-3 text-left',
                          isSelected
                            ? 'bg-muted ring-1 ring-primary/30 hover:bg-muted'
                            : 'hover:bg-muted/50',
                        )}
                      >
                        <span className="w-9 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          #{invoice.numero}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {formatDate(invoice.fecha)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <EstadoBadge estado={invoice.estado} />
                            <span className="text-[11px] text-muted-foreground">
                              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
                            </span>
                          </span>
                        </span>
                        <span
                          className={cn(
                            'whitespace-nowrap text-sm font-semibold tabular-nums text-foreground',
                            invoice.estado === 'cancelada' &&
                              'text-muted-foreground line-through opacity-70',
                          )}
                        >
                          {formatCurrency(invoice.total)}
                        </span>
                        <ChevronRight
                          className={cn(
                            'size-4 shrink-0',
                            isSelected ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>

        <section
          className={selectedInvoice ? '' : 'hidden lg:block'}
          aria-label="Detalle de factura"
        >
          {selectedInvoice ? (
            <InvoiceDetail
              invoice={selectedInvoice}
              onBack={onClearSelection}
              onUpdateState={onUpdateState}
            />
          ) : (
            <Card className="grid min-h-64 place-items-center gap-0 border-dashed bg-card/50 px-6 py-12 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-card text-muted-foreground">
                  <ReceiptText className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">Elige una factura</h2>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                  Selecciona una factura de la lista para ver sus artículos y su total.
                </p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
