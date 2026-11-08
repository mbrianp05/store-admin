import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function CartLine({ item, onIncrement, onDecrement, onRemove }) {
  const subtotal = item.producto.precio * item.cantidad

  return (
    <li className="cart-line group/line animate-in fade-in slide-in-from-right-2 grid h-[72px] grid-rows-2 duration-200">
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 truncate text-sm font-medium leading-tight text-ink">
          <span className="cart-line-label">{item.producto.nombre}</span>
        </p>
        <span
          aria-hidden="true"
          className="mb-1 min-w-2 flex-1 border-b border-dotted border-ink/25"
        />
        <span className="shrink-0 text-sm font-semibold tabular-nums tracking-tight text-ink">
          {formatCurrency(subtotal)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.producto.nombre)}
          aria-label={`Quitar ${item.producto.nombre} del carrito`}
          className="-mr-1 size-6 shrink-0 text-ink/40 hover:bg-[#e07a5f]/15 hover:text-[#f0a48c] focus-visible:ring-ink focus-visible:ring-offset-paper"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">
          {formatCurrency(item.producto.precio)} c/u
        </p>
        <div className="inline-flex items-center overflow-hidden rounded-[5px] border border-ink/20 bg-white/[0.04]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDecrement(item.producto.nombre)}
            aria-label={`Restar una unidad de ${item.producto.nombre}`}
            className="size-6 rounded-none text-ink-soft hover:bg-ink/10 hover:text-ink focus-visible:ring-ink focus-visible:ring-offset-paper"
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-6 text-center text-xs font-medium tabular-nums text-ink">
            {item.cantidad}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onIncrement(item.producto.nombre)}
            aria-label={`Sumar una unidad de ${item.producto.nombre}`}
            className="size-6 rounded-none text-ink-soft hover:bg-ink/10 hover:text-ink focus-visible:ring-ink focus-visible:ring-offset-paper"
          >
            <Plus className="size-3" />
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
    <div className={cn('paper-stack h-full', className)}>
      <div className="paper-sheet relative flex h-full flex-col overflow-hidden rounded-[3px]">
        <header className="shrink-0 border-b border-dashed border-ink/20 px-5 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-none tracking-tight text-ink">
                Carrito
              </h2>
              <p className="mt-2 text-xs leading-none text-ink-soft">
                Se factura al emitir.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant="outline"
                className="border-ink/15 bg-ink/[0.04] text-[11px] text-ink"
              >
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
                  className="size-7 text-ink-soft hover:bg-ink/10 hover:text-ink focus-visible:ring-ink focus-visible:ring-offset-paper"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-0">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-full border border-dashed border-ink/30 text-ink/45">
                <ShoppingBag className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">
                La lista está vacía
              </h3>
              <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-ink-soft">
                Sumá productos desde el inventario y armá la lista.
              </p>
            </div>
          ) : (
            <ul className="paper-lines min-h-full">
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

        <footer className="shrink-0 border-t border-dashed border-ink/20 px-5 pb-4 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium text-ink-soft">Total</span>
            <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-ink">
              {formatCurrency(total)}
            </span>
          </div>
          <Button
            type="button"
            onClick={onCheckout}
            disabled={cart.length === 0 || checkingOut}
            aria-busy={checkingOut}
            className="mt-3 h-10 w-full rounded-[5px] bg-ink text-sm font-semibold text-paper shadow-[0_2px_0_rgb(0_0_0/0.28)] hover:bg-[#faf9f5] active:translate-y-px active:shadow-none focus-visible:ring-ink focus-visible:ring-offset-paper"
          >
            {checkingOut ? 'Emitiendo factura…' : 'Emitir factura'}
          </Button>
          <p className="mt-2 text-center text-[11px] text-ink-soft">
            Revisá las cantidades antes de emitir.
          </p>
        </footer>
      </div>
    </div>
  )
}
