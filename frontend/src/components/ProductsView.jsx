import { useEffect, useMemo, useState } from 'react'
import { Image, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import ProductForm from './ProductForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

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

  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-muted/30">
      {showPhoto ? (
        <img
          src={cover}
          alt={product.nombre}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(cover)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Image className="size-7" />
          <span className="text-[11px]">Sin foto</span>
        </div>
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

function ProductCard({
  product,
  inCart,
  confirming,
  deleting,
  onAdd,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <div className="relative">
        <ProductCover product={product} inCart={inCart} />
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          onClick={() => onEdit(product)}
          aria-label={`Editar ${product.nombre}`}
          className="absolute left-2 top-2 backdrop-blur-sm"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          onClick={() => onRequestDelete(product.nombre)}
          aria-label={`Eliminar ${product.nombre}`}
          className="absolute right-2 top-2 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
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

        <div className="mt-auto flex items-center justify-between gap-2">
          {confirming ? (
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                ¿Eliminar producto?
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={() => onConfirmDelete(product.nombre)}
                  className="h-7 px-2.5 text-[11px]"
                >
                  Sí
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelDelete}
                  className="h-7 px-2.5 text-[11px]"
                >
                  No
                </Button>
              </div>
            </div>
          ) : (
            <>
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  {formatCurrency(product.precio)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  / {product.unidad_medida || 'unidad'}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAdd(product)}
                aria-label={`Agregar ${product.nombre} al carrito`}
              >
                <Plus className="size-3.5" />
                Agregar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProductsView({
  products,
  loading,
  search,
  onSearchChange,
  cart,
  onAddToCart,
  onDelete,
  onCreate,
  onUpdate,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const isFormOpen = showForm || Boolean(editing)

  useEffect(() => {
    if (!editing) return
    document
      .getElementById('producto-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [editing])

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(product) {
    setShowForm(false)
    setEditing(product)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => {
      const haystack = `${product.nombre} ${product.descripcion || ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [products, search])

  function quantityInCart(nombre) {
    return cart
      .filter((item) => item.producto.nombre === nombre)
      .reduce((total, item) => total + item.cantidad, 0)
  }

  async function handleDelete(nombre) {
    setDeleting(true)
    await onDelete(nombre)
    setDeleting(false)
    setConfirming(null)
    if (editing?.nombre === nombre) closeForm()
  }

  const hasSearch = search.trim().length > 0

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
          onClick={() => (isFormOpen ? closeForm() : openCreate())}
          aria-expanded={isFormOpen}
          aria-controls="producto-form"
          className="sm:self-end"
        >
          <Plus className="size-4" />
          {isFormOpen ? 'Cerrar formulario' : 'Agregar producto'}
        </Button>
      </header>

      {isFormOpen && (
        <div id="producto-form">
          <ProductForm
            key={editing ? `editar-${editing.nombre}` : 'nuevo'}
            product={editing}
            onSave={
              editing
                ? (payload) => onUpdate(editing.nombre, payload)
                : onCreate
            }
            onClose={closeForm}
          />
        </div>
      )}

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
        {hasSearch && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </p>
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
          <Button
            type="button"
            onClick={openCreate}
            className="mt-5"
          >
            <Plus className="size-4" />
            Agregar producto
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="gap-0 px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
            <Search className="size-5" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Sin coincidencias</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            No encontramos productos para “{search.trim()}”. Probá con otro nombre o
            descripción.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSearchChange('')}
            className="mt-5"
          >
            Limpiar búsqueda
          </Button>
        </Card>
      ) : (
        <div className={CARD_GRID}>
          {filtered.map((product) => (
            <ProductCard
              key={product.nombre}
              product={product}
              inCart={quantityInCart(product.nombre)}
              confirming={confirming === product.nombre}
              deleting={deleting}
              onAdd={onAddToCart}
              onEdit={openEdit}
              onRequestDelete={setConfirming}
              onCancelDelete={() => setConfirming(null)}
              onConfirmDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
