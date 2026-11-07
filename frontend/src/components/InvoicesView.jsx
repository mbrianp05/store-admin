import { ArrowLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { formatCurrency, formatDate } from '../lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

function InvoiceDetail({ invoice, onBack }) {
  const itemCount = invoice.items.reduce((total, item) => total + item.cantidad, 0)

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
            <p className="text-xs font-medium text-muted-foreground">Factura emitida</p>
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
            {invoice.items.map((item, index) => (
              <tr key={`${item.producto.nombre}-${index}`} className="border-t border-border/70">
                <td className="py-3 pr-3 text-sm leading-snug text-foreground">
                  {item.producto.nombre}
                </td>
                <td className="whitespace-nowrap py-3 text-right text-sm tabular-nums text-muted-foreground">
                  {item.cantidad}
                </td>
                <td className="hidden whitespace-nowrap py-3 text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                  {formatCurrency(item.producto.precio)}
                </td>
                <td className="whitespace-nowrap py-3 text-right text-sm font-medium tabular-nums">
                  {formatCurrency(item.producto.precio * item.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex items-baseline justify-between border-t border-border bg-muted/30 px-5 py-4 sm:px-7">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-xl font-semibold tabular-nums leading-none tracking-tight">
          {formatCurrency(invoice.total)}
        </span>
      </footer>
    </Card>
  )
}

export default function InvoicesView({
  invoices,
  loading,
  selectedInvoice,
  onSelect,
  onClearSelection,
}) {
  const sorted = [...invoices].sort((a, b) => b.numero - a.numero)

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

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          className={selectedInvoice ? 'hidden lg:block' : ''}
          aria-label="Facturas emitidas"
        >
          <Card className="gap-0 overflow-hidden py-0">
            {loading ? (
              <InvoiceListSkeleton />
            ) : sorted.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                  <ReceiptText className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">No hay facturas</h2>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                  Agregá productos al carrito y emití la primera factura desde el panel del
                  carrito.
                </p>
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
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
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
            <InvoiceDetail invoice={selectedInvoice} onBack={onClearSelection} />
          ) : (
            <Card className="grid min-h-64 place-items-center gap-0 border-dashed bg-card/50 px-6 py-12 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-card text-muted-foreground">
                  <ReceiptText className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">Elegí una factura</h2>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-snug text-muted-foreground">
                  Seleccioná una factura de la lista para ver sus artículos y su total.
                </p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
