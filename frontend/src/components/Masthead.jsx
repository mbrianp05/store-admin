import { ShoppingCart } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import BrandMark from './BrandMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const todayFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

const today = todayFormatter.format(new Date())

const TRIGGER_CLASS =
  'inline-flex h-full flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function SectionTabs({ pathname, counts, stretch = false }) {
  const isInvoices = pathname.startsWith('/facturas')

  return (
    <nav
      aria-label="Secciones"
      className={cn(
        'inline-flex w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        stretch ? 'h-10 w-full' : 'h-9',
      )}
    >
      <Link
        to="/"
        aria-current={!isInvoices ? 'page' : undefined}
        className={cn(
          TRIGGER_CLASS,
          stretch && 'h-8',
          isInvoices
            ? 'hover:text-foreground'
            : 'bg-background text-foreground shadow-xs',
        )}
      >
        Productos
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {counts.products}
        </span>
      </Link>
      <Link
        to="/facturas"
        aria-current={isInvoices ? 'page' : undefined}
        className={cn(
          TRIGGER_CLASS,
          stretch && 'h-8',
          isInvoices
            ? 'bg-background text-foreground shadow-xs'
            : 'hover:text-foreground',
        )}
      >
        Facturas
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {counts.invoices}
        </span>
      </Link>
    </nav>
  )
}

export default function Masthead({
  productCount,
  invoiceCount,
  cartCount = 0,
  onOpenCart,
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const counts = { products: productCount, invoices: invoiceCount }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BrandMark className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-none tracking-tight">Mostrador</p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
              Insumos para bijouterie
            </p>
          </div>
        </div>

        <div className="hidden sm:block">
          <SectionTabs pathname={pathname} counts={counts} />
        </div>

        <div className="flex items-center gap-2.5">
          <p className="hidden text-xs text-muted-foreground lg:block">{today}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenCart}
            aria-label={
              cartCount > 0
                ? `Abrir carrito (${cartCount} ${cartCount === 1 ? 'artículo' : 'artículos'})`
                : 'Abrir carrito'
            }
            className="relative text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ShoppingCart className="size-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="border-t border-border/70 px-2 py-1.5 sm:hidden">
        <SectionTabs pathname={pathname} counts={counts} stretch />
      </div>
    </header>
  )
}
