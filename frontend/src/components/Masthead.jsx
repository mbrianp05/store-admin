import { LogIn, LogOut, Package, ReceiptText, Settings, ShoppingCart } from 'lucide-react'
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

function SectionLink({ to, icon: Icon, label, count, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'text-foreground'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      <Icon
        className={cn('size-4', active ? 'text-foreground' : 'text-muted-foreground')}
      />
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-normal tabular-nums',
          active
            ? 'bg-secondary text-foreground'
            : 'bg-muted/60 text-muted-foreground',
        )}
      >
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-2.5 -bottom-1.5 h-0.5 rounded-full bg-foreground" />
      )}
    </Link>
  )
}

function MobileSectionLink({ to, icon: Icon, label, count, active }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'relative grid size-8 place-items-center rounded-lg transition-colors',
          active ? 'bg-secondary text-foreground' : 'text-muted-foreground',
        )}
      >
        <Icon className="size-[18px]" />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-normal tabular-nums text-primary-foreground ring-2 ring-background">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  )
}

export default function Masthead({
  productCount,
  invoiceCount,
  cartCount = 0,
  onOpenCart,
  onOpenSettings,
  user,
  onLogout,
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isInvoices = pathname.startsWith('/facturas')
  const autenticado = Boolean(user)
  const counts = { products: productCount, invoices: invoiceCount }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BrandMark className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-none tracking-tight">
                Mostrador
              </p>
              <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
                Insumos para bijouterie
              </p>
            </div>

            <span
              aria-hidden="true"
              className="mx-1 hidden h-6 w-px bg-border/80 sm:block"
            />

            <nav aria-label="Secciones" className="hidden items-center gap-0.5 sm:flex">
              <SectionLink
                to="/"
                icon={Package}
                label="Productos"
                count={counts.products}
                active={!isInvoices}
              />
              {autenticado && (
                <SectionLink
                  to="/facturas"
                  icon={ReceiptText}
                  label="Facturas"
                  count={counts.invoices}
                  active={isInvoices}
                />
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <p className="hidden text-xs text-muted-foreground lg:block">{today}</p>
            {autenticado && (
              <p className="hidden max-w-[14rem] truncate text-xs text-muted-foreground md:block">
                {user.nombres} {user.apellidos}
              </p>
            )}
            {autenticado ? (
              <>
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
                    <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-normal tabular-nums text-primary-foreground ring-2 ring-background">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Button>
                {onOpenSettings && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onOpenSettings}
                    aria-label="Configuración"
                    title="Configuración"
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Settings className="size-[18px]" />
                  </Button>
                )}
                {onLogout && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <LogOut className="size-[18px]" />
                  </Button>
                )}
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/login">
                  <LogIn className="size-4" />
                  Ingresar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <div className={cn('grid', autenticado ? 'grid-cols-2' : 'grid-cols-1')}>
          <MobileSectionLink
            to="/"
            icon={Package}
            label="Productos"
            count={counts.products}
            active={!isInvoices}
          />
          {autenticado && (
            <MobileSectionLink
              to="/facturas"
              icon={ReceiptText}
              label="Facturas"
              count={counts.invoices}
              active={isInvoices}
            />
          )}
        </div>
      </nav>
    </>
  )
}
