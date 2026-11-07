import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import {
  createInvoice,
  createProduct,
  deleteProduct,
  getInvoices,
  getProducts,
  updateProduct,
} from './api'
import CartPanel from './components/CartPanel'
import InvoicesView from './components/InvoicesView'
import Masthead from './components/Masthead'
import ProductsView from './components/ProductsView'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { formatCurrency } from './lib/format'

function MobileCartBar({ count, total, onOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fixed inset-x-3 bottom-3 z-30 duration-300 xl:hidden">
      <Card className="gap-0 border-border bg-card py-0 shadow-lg">
        <Button
          type="button"
          variant="ghost"
          onClick={onOpen}
          className="h-auto w-full justify-between gap-4 rounded-xl px-3 py-2.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <ShoppingBag className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-tight text-foreground">
                Carrito
              </span>
              <span className="mt-0.5 block text-[11px] leading-none text-muted-foreground">
                {count} {count === 1 ? 'artículo' : 'artículos'}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {formatCurrency(total)}
            </span>
            <span className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              Abrir
            </span>
          </span>
        </Button>
      </Card>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('products')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const notify = useCallback((message, tone = 'success') => {
    if (tone === 'error') {
      toast.error(message)
    } else {
      toast.success(message)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [productsData, invoicesData] = await Promise.all([getProducts(), getInvoices()])
      setProducts(productsData)
      setInvoices(invoicesData)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga inicial desde la API
    fetchData()
  }, [fetchData])

  const reloadData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchData()
  }, [fetchData])

  const addToCart = useCallback(
    (product) => {
      const disponible = Number(product.stock) || 0
      const enCarrito = cart
        .filter((item) => item.producto.nombre === product.nombre)
        .reduce((total, item) => total + item.cantidad, 0)

      if (enCarrito + 1 > disponible) {
        notify(
          disponible === 0
            ? `"${product.nombre}" no tiene stock disponible.`
            : `No podés agregar más de "${product.nombre}". Stock disponible: ${disponible}.`,
          'error',
        )
        return
      }

      setCart((current) => {
        const existing = current.find((item) => item.producto.nombre === product.nombre)
        if (existing) {
          return current.map((item) =>
            item.producto.nombre === product.nombre
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          )
        }
        return [...current, { producto: product, cantidad: 1 }]
      })
    },
    [cart, notify],
  )

  const changeQuantity = useCallback(
    (nombre, delta) => {
      const item = cart.find((entry) => entry.producto.nombre === nombre)
      if (delta > 0 && item) {
        const disponible = Number(item.producto.stock) || 0
        if (item.cantidad + delta > disponible) {
          notify(
            `No podés superar el stock de "${nombre}". Disponible: ${disponible}.`,
            'error',
          )
          return
        }
      }

      setCart((current) =>
        current.flatMap((entry) => {
          if (entry.producto.nombre !== nombre) return [entry]
          const cantidad = entry.cantidad + delta
          return cantidad > 0 ? [{ ...entry, cantidad }] : []
        }),
      )
    },
    [cart, notify],
  )

  const removeFromCart = useCallback((nombre) => {
    setCart((current) => current.filter((item) => item.producto.nombre !== nombre))
  }, [])

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return

    const sinStock = cart.find(
      (item) => item.cantidad > (Number(item.producto.stock) || 0),
    )
    if (sinStock) {
      notify(
        `No hay stock suficiente de "${sinStock.producto.nombre}". Disponible: ${Number(sinStock.producto.stock) || 0}.`,
        'error',
      )
      return
    }

    setCheckingOut(true)
    try {
      const invoice = await createInvoice(cart)
      setProducts((current) =>
        current.map((product) => {
          const item = cart.find((entry) => entry.producto.nombre === product.nombre)
          if (!item) return product
          return {
            ...product,
            stock: Math.max(0, (Number(product.stock) || 0) - item.cantidad),
          }
        }),
      )
      setInvoices((current) => [...current, invoice])
      setSelectedInvoice(invoice)
      setCart([])
      setView('invoices')
      setCartOpen(false)
      notify(`Factura #${invoice.numero} emitida.`)
    } catch (checkoutError) {
      notify(checkoutError.message, 'error')
    } finally {
      setCheckingOut(false)
    }
  }, [cart, notify])

  const handleCreateProduct = useCallback(
    async (product) => {
      try {
        const created = await createProduct(product)
        setProducts((current) => [...current, created])
        notify(`"${created.nombre}" se agregó al inventario.`)
        return true
      } catch (createError) {
        notify(createError.message, 'error')
        return false
      }
    },
    [notify],
  )

  const handleUpdateProduct = useCallback(
    async (nombreOriginal, product) => {
      try {
        const updated = await updateProduct(nombreOriginal, product)
        setProducts((current) =>
          current.map((item) => (item.nombre === nombreOriginal ? updated : item)),
        )
        setCart((current) =>
          current.map((item) =>
            item.producto.nombre === nombreOriginal
              ? { ...item, producto: updated }
              : item,
          ),
        )
        notify(`"${updated.nombre}" se actualizó.`)
        return true
      } catch (updateError) {
        notify(updateError.message, 'error')
        return false
      }
    },
    [notify],
  )

  const handleDeleteProduct = useCallback(
    async (nombre) => {
      try {
        await deleteProduct(nombre)
        setProducts((current) => current.filter((product) => product.nombre !== nombre))
        setCart((current) => current.filter((item) => item.producto.nombre !== nombre))
        notify(`"${nombre}" se eliminó del inventario.`)
      } catch (deleteError) {
        notify(deleteError.message, 'error')
      }
    },
    [notify],
  )

  const cartCount = cart.reduce((total, item) => total + item.cantidad, 0)
  const cartTotal = cart.reduce(
    (total, item) => total + item.producto.precio * item.cantidad,
    0,
  )

  const cartPanelProps = {
    cart,
    onIncrement: (nombre) => changeQuantity(nombre, 1),
    onDecrement: (nombre) => changeQuantity(nombre, -1),
    onRemove: removeFromCart,
    onCheckout: handleCheckout,
    checkingOut,
  }

  return (
    <div className="min-h-screen bg-background">
      <Masthead
        view={view}
        onViewChange={setView}
        productCount={products.length}
        invoiceCount={invoices.length}
      />

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                No se pudo cargar la información: {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reloadData}
                className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid pb-28 xl:min-h-[calc(100vh-4rem)] xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:gap-8 xl:pb-0">
          <main className="min-w-0 py-6 sm:py-8">
            {view === 'products' ? (
              <ProductsView
                products={products}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                cart={cart}
                onAddToCart={addToCart}
                onDelete={handleDeleteProduct}
                onCreate={handleCreateProduct}
                onUpdate={handleUpdateProduct}
              />
            ) : (
              <InvoicesView
                invoices={invoices}
                loading={loading}
                selectedInvoice={selectedInvoice}
                onSelect={setSelectedInvoice}
                onClearSelection={() => setSelectedInvoice(null)}
              />
            )}
          </main>

          <aside className="hidden xl:block" aria-label="Carrito">
            <div className="sticky top-16 h-[calc(100vh-4rem)] py-8">
              <CartPanel {...cartPanelProps} className="h-full" />
            </div>
          </aside>
        </div>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full rounded-l-xl border-border bg-card p-0 sm:max-w-[24rem]"
        >
          <CartPanel
            {...cartPanelProps}
            onClose={() => setCartOpen(false)}
            className="h-full rounded-none border-0"
          />
        </SheetContent>
      </Sheet>

      {cartCount > 0 && (
        <MobileCartBar
          count={cartCount}
          total={cartTotal}
          onOpen={() => setCartOpen(true)}
        />
      )}

      <Toaster position="bottom-right" />
    </div>
  )
}
