import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Filter, PackageOpen, Plus, Search, Tag, X } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import { descuentoVigente, precioVigente } from '../lib/pricing'
import ProductForm from './ProductForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const CARD_GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

function SkeletonCards() {
  return (
    <div className={CARD_GRID}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="gap-0 overflow-hidden py-0">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ProductCover({ product, inCart }) {
  const fotos = Array.isArray(product.fotos)
    ? product.fotos
    : product.foto
      ? [product.foto]
      : []
  const cover = fotos[0]
  const [failedSrc, setFailedSrc] = useState(null)
  const showPhoto = cover && failedSrc !== cover
  const descuento = descuentoVigente(product)

  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-muted/30">
      {showPhoto && (
        <img
          src={cover}
          alt={product.nombre}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(cover)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}

      {descuento && (
        <Badge className="absolute left-2 top-2 border border-black/10 bg-highlight font-semibold text-[#231a05] shadow-sm">
          −{descuento.porcentaje}% de descuento
        </Badge>
      )}

      {inCart > 0 && (
        <Badge className="absolute bottom-2 left-2">
          {inCart} en el carrito
        </Badge>
      )}

      {fotos.length > 1 && (
        <Badge variant="muted" className="absolute bottom-2 right-2">
          {fotos.length} fotos
        </Badge>
      )}
    </div>
  )
}

function ProductCard({ product, inCart, onAdd }) {
  const descuento = descuentoVigente(product)
  const precio = precioVigente(product)
  const sinStock = (Number(product.stock) || 0) <= 0

  return (
    <Card className="group relative h-full gap-0 overflow-hidden py-0 transition-colors hover:border-foreground/20">
      <Link
        to="/productos/$nombre"
        params={{ nombre: product.nombre }}
        aria-label={`Ver la ficha de ${product.nombre}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      <span className="pointer-events-none absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-md border border-border/80 bg-background/75 text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <ArrowUpRight className="size-3.5" />
      </span>

      <ProductCover product={product} inCart={inCart} />

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          {product.categoria && (
            <Badge
              variant="outline"
              className="mb-1.5 border-border/80 bg-muted/30 text-[10px] font-medium text-muted-foreground"
            >
              <Tag className="size-2.5" />
              {product.categoria}
            </Badge>
          )}
          <h3
            className="truncate font-medium leading-snug text-foreground"
            title={product.nombre}
          >
            {product.nombre}
          </h3>
          {product.descripcion && (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
              {product.descripcion}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span
              className={cn(
                'truncate text-lg font-semibold tabular-nums tracking-tight',
                descuento ? 'text-highlight' : 'text-foreground',
              )}
            >
              {formatCurrency(precio)}
            </span>
            {descuento && (
              <span className="text-xs tabular-nums text-muted-foreground line-through">
                {formatCurrency(product.precio)}
              </span>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">
              / {product.unidad_medida || 'unidad'}
            </span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdd(product)}
            disabled={sinStock}
            aria-label={`Agregar ${product.nombre} al carrito`}
            className="relative z-20 h-7 w-full text-xs"
          >
            {sinStock ? (
              'Sin stock'
            ) : (
              <>
                <Plus className="size-3.5" />
                Agregar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({ active, onClick, children, count }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-7 gap-1.5 rounded-full border px-3 text-xs font-medium',
        active
          ? 'border-border bg-secondary text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
    >
      {children}
      {count != null && (
        <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
      )}
    </Button>
  )
}

export default function ProductsView({
  products,
  loading,
  search,
  onSearchChange,
  cart,
  onAddToCart,
  onCreate,
}) {
  const [showForm, setShowForm] = useState(false)
  const [categoria, setCategoria] = useState('')

  const categorias = useMemo(() => {
    const conteo = new Map()
    for (const product of products) {
      const nombre = (product.categoria || '').trim()
      if (!nombre) continue
      conteo.set(nombre, (conteo.get(nombre) || 0) + 1)
    }
    return [...conteo.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [products])

  const unidades = useMemo(
    () =>
      [...new Set(products.map((product) => (product.unidad_medida || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es')),
    [products],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((product) => {
      if (categoria && product.categoria !== categoria) return false
      if (!term) return true
      const haystack = `${product.nombre} ${product.descripcion || ''} ${product.categoria || ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [products, search, categoria])

  function quantityInCart(nombre) {
    return cart
      .filter((item) => item.producto.nombre === nombre)
      .reduce((total, item) => total + item.cantidad, 0)
  }

  const hasSearch = search.trim().length > 0
  const hasFilters = hasSearch || Boolean(categoria)

  function limpiarFiltros() {
    onSearchChange('')
    setCategoria('')
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Productos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length === 0
              ? 'Todavía no hay productos en el inventario.'
              : `${products.length} ${products.length === 1 ? 'producto' : 'productos'} en inventario`}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((actual) => !actual)}
          aria-expanded={showForm}
          aria-controls="producto-form"
          className="sm:self-end"
        >
          <Plus className="size-4" />
          {showForm ? 'Cerrar formulario' : 'Agregar producto'}
        </Button>
      </header>

      {showForm && (
        <div id="producto-form">
          <ProductForm
            key="nuevo"
            product={null}
            categorias={categorias.map((item) => item.nombre)}
            unidades={unidades}
            onSave={onCreate}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Buscar productos</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar en el inventario"
              className="pl-9 pr-9"
            />
            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onSearchChange('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </label>
          {hasFilters && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>

        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Filter className="size-3" />
              Categorías
            </span>
            <FilterChip
              active={!categoria}
              onClick={() => setCategoria('')}
              count={products.length}
            >
              Todas
            </FilterChip>
            {categorias.map((item) => (
              <FilterChip
                key={item.nombre}
                active={categoria === item.nombre}
                onClick={() => setCategoria(item.nombre)}
                count={item.cantidad}
              >
                {item.nombre}
              </FilterChip>
            ))}
            {categoria && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCategoria('')}
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
              >
                <X className="size-3" />
                Quitar filtro
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonCards />
      ) : products.length === 0 ? (
        <Card className="gap-0 px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-primary">
            <Plus className="size-5" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">No hay productos todavía</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Agregá el primer producto para empezar a armar el carrito y emitir facturas.
          </p>
          <Button type="button" onClick={() => setShowForm(true)} className="mt-5">
            <Plus className="size-4" />
            Agregar producto
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="gap-0 px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
            <PackageOpen className="size-5" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Sin coincidencias</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {categoria
              ? `No hay productos en la categoría «${categoria}»${
                  hasSearch ? ` para “${search.trim()}”` : ''
                }.`
              : `No encontramos productos para “${search.trim()}”. Probá con otro nombre o descripción.`}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={limpiarFiltros}
            className="mt-5"
          >
            Limpiar filtros
          </Button>
        </Card>
      ) : (
        <div className={CARD_GRID}>
          {filtered.map((product) => (
            <ProductCard
              key={product.nombre}
              product={product}
              inCart={quantityInCart(product.nombre)}
              onAdd={onAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  )
}
