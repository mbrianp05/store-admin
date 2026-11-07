import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function CartLine({ item, onIncrement, onDecrement, onRemove }) {
  const subtotal = item.producto.precio * item.cantidad

  return (
    <li className="animate-in fade-in slide-in-from-right-2 border-b border-border/70 pb-4 duration-200 last:border-0 last:pb-0">
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-foreground">
          {item.producto.nombre}
        </p>
        <span aria-hidden="true" className="mb-1 flex-1 border-b border-dotted border-border" />
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(subtotal)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.producto.nombre)}
          aria-label={`Quitar ${item.producto.nombre} del carrito`}
          className="-mr-1.5 size-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {formatCurrency(item.producto.precio)}
        </p>
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDecrement(item.producto.nombre)}
            aria-label={`Restar una unidad de ${item.producto.nombre}`}
            className="size-7 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">
            {item.cantidad}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onIncrement(item.producto.nombre)}
            aria-label={`Sumar una unidad de ${item.producto.nombre}`}
            className="size-7 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  )
}

export default function CartPanel({
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  checkingOut,
  onClose,
  className,
}) {
  const count = cart.reduce((total, item) => total + item.cantidad, 0)
  const total = cart.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0)

  return (
    <Card
      className={cn(
        'h-full gap-0 overflow-hidden border-border bg-card py-0 shadow-none',
        className,
      )}
    >
      <header className="border-b border-dashed border-border px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold leading-none tracking-tight">Carrito</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {count === 0
                ? 'Vacío'
                : `${count} ${count === 1 ? 'artículo' : 'artículos'}`}
            </Badge>
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Cerrar carrito"
                className="size-7 text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Se factura al emitir.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {cart.length === 0 ? (
          <div className="grid h-full place-items-center py-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl border border-dashed border-border text-muted-foreground">
                <ShoppingBag className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">El carrito está vacío</h3>
              <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-snug text-muted-foreground">
                Sumá productos desde el inventario para armar una factura.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {cart.map((item) => (
              <CartLine
                key={item.producto.nombre}
                item={item}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={onCheckout}
          disabled={cart.length === 0 || checkingOut}
          aria-busy={checkingOut}
          className="mt-4 w-full"
        >
          {checkingOut ? 'Emitiendo factura…' : 'Emitir factura'}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Revisá las cantidades antes de emitir.
        </p>
      </footer>
    </Card>
  )
}
