import { ShoppingCart } from 'lucide-react'
import BrandMark from './BrandMark'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const todayFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

const today = todayFormatter.format(new Date())

function SectionTabs({ view, onViewChange, counts, stretch = false }) {
  return (
    <Tabs value={view} onValueChange={onViewChange}>
      <TabsList
        aria-label="Secciones"
        className={cn(stretch ? 'h-10 w-full' : 'h-9')}
      >
        <TabsTrigger value="products" className={stretch ? 'h-8' : undefined}>
          Productos
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {counts.products}
          </span>
        </TabsTrigger>
        <TabsTrigger value="invoices" className={stretch ? 'h-8' : undefined}>
          Facturas
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {counts.invoices}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default function Masthead({
  view,
  onViewChange,
  productCount,
  invoiceCount,
  cartCount = 0,
  onOpenCart,
}) {
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
          <SectionTabs view={view} onViewChange={onViewChange} counts={counts} />
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
        <SectionTabs
          view={view}
          onViewChange={onViewChange}
          counts={counts}
          stretch
        />
      </div>
    </header>
  )
}
