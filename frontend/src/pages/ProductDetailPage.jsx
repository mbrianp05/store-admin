import { useMemo, useState } from 'react'
import { ArrowLeft, PackageOpen, Pencil, Percent, Plus, Tag, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'
import ProductForm from '../components/ProductForm'
import ProductGallery from '../components/ProductGallery'
import { useAppState } from '../app-context'
import { formatCurrency } from '../lib/format'
import { diasEntre, formatFechaCorta, hoyISO } from '../lib/fechas'
import { descuentoVigente, estadoDescuento, precioVigente } from '../lib/pricing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ESTADOS = {
  activo: {
    etiqueta: 'Activo',
    clase: 'border-transparent bg-highlight/15 text-highlight',
  },
  programado: {
    etiqueta: 'Programado',
    clase: 'border-border text-muted-foreground',
  },
  vencido: {
    etiqueta: 'Vencido',
    clase: 'border-border text-muted-foreground',
  },
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function DiscountSummary({ product }) {
  const estado = estadoDescuento(product)
  const descuento = estado ? product.descuento : null
  const vigente = descuentoVigente(product)
  const info = estado ? ESTADOS[estado] : null

  let detalle = ''
  if (estado === 'activo') {
    const dias = diasEntre(hoyISO(), descuento.hasta)
    detalle =
      dias <= 1
        ? 'El descuento termina hoy.'
        : `Quedan ${dias} días de descuento.`
  } else if (estado === 'programado') {
    detalle = `Empieza el ${formatFechaCorta(descuento.desde)}.`
  } else if (estado === 'vencido') {
    detalle = `Terminó el ${formatFechaCorta(descuento.hasta)}.`
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-start gap-3 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-highlight/10 text-highlight">
          <Percent className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Descuento por periodo</p>
            {info && (
              <Badge variant="outline" className={info.clase}>
                {info.etiqueta}
              </Badge>
            )}
          </div>

          {descuento ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {descuento.porcentaje}% entre {formatFechaCorta(descuento.desde)} y{' '}
                {formatFechaCorta(descuento.hasta)}.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
              <p className="mt-3 text-sm text-foreground">
                Precio con descuento:{' '}
                <span className="font-semibold tabular-nums text-highlight">
                  {formatCurrency(
                    vigente ? precioVigente(product) : precioVigente(product, descuento.desde),
                  )}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin descuento programado. Podés agregar uno desde «Editar producto».
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ProductDetailPage() {
  const { nombre } = useParams({ from: '/_app/productos/$nombre' })
  const navigate = useNavigate()
  const {
    products,
    loading,
    cart,
    onAddToCart,
    onUpdateProduct,
    onDeleteProduct,
  } = useAppState()

  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const product = useMemo(() => {
    const buscado = String(nombre || '')
    return (
      products.find((item) => item.nombre === buscado) ||
      products.find((item) => item.nombre.toLowerCase() === buscado.toLowerCase())
    )
  }, [products, nombre])

  const categorias = useMemo(
    () =>
      [...new Set(products.map((item) => item.categoria).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'es'),
      ),
    [products],
  )

  const unidades = useMemo(
    () =>
      [...new Set(products.map((item) => (item.unidad_medida || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es')),
    [products],
  )

  if (loading) return <DetailSkeleton />

  if (!product) {
    return (
      <Card className="gap-0 px-6 py-16 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
          <PackageOpen className="size-5" />
        </span>
        <h1 className="mt-5 text-lg font-semibold">No encontramos ese producto</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Puede que lo hayan eliminado del inventario o que el enlace esté incompleto.
        </p>
        <Button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="mt-5"
        >
          <ArrowLeft className="size-4" />
          Volver a productos
        </Button>
      </Card>
    )
  }

  const descuento = descuentoVigente(product)
  const precio = precioVigente(product)
  const fotos = Array.isArray(product.fotos)
    ? product.fotos
    : product.foto
      ? [product.foto]
      : []
  const stock = Number(product.stock) || 0
  const sinStock = stock <= 0
  const enCarrito = cart
    .filter((item) => item.producto.nombre === product.nombre)
    .reduce((total, item) => total + item.cantidad, 0)

  async function handleSave(payload) {
    const updated = await onUpdateProduct(product.nombre, payload)
    if (!updated) return false
    if (updated.nombre !== product.nombre) {
      navigate({
        to: '/productos/$nombre',
        params: { nombre: updated.nombre },
        replace: true,
      })
    }
    return true
  }

  async function handleDelete() {
    setEliminando(true)
    const eliminado = await onDeleteProduct(product.nombre)
    setEliminando(false)
    if (eliminado) navigate({ to: '/', replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/' })}
          className="-ml-2 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a productos
        </Button>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditando((actual) => !actual)}
            aria-expanded={editando}
          >
            <Pencil className="size-3.5" />
            {editando ? 'Cerrar edición' : 'Editar producto'}
          </Button>

          {confirmando ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={eliminando}
                aria-busy={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Confirmar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmando(false)}
                disabled={eliminando}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmando(true)}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {editando && (
        <ProductForm
          key={product.nombre}
          product={product}
          categorias={categorias}
          unidades={unidades}
          onSave={handleSave}
          onClose={() => setEditando(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <ProductGallery key={product.nombre} nombre={product.nombre} fotos={fotos} />

        <div className="space-y-4">
          <Card className="gap-0 py-0">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.categoria && (
                  <Badge
                    variant="outline"
                    className="border-border/80 bg-muted/30 text-muted-foreground"
                  >
                    <Tag className="size-2.5" />
                    {product.categoria}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    sinStock
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/30 text-muted-foreground',
                  )}
                >
                  {sinStock ? 'Sin stock' : `${stock} disponibles`}
                </Badge>
                {descuento && (
                  <Badge className="border-transparent bg-highlight/15 text-highlight">
                    −{descuento.porcentaje}%
                  </Badge>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                {product.nombre}
              </h1>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.descripcion || 'Sin descripción.'}
              </p>

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Precio</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      'text-3xl font-semibold tracking-tight tabular-nums',
                      descuento ? 'text-highlight' : 'text-foreground',
                    )}
                  >
                    {formatCurrency(precio)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {product.unidad_medida || 'unidad'}
                  </span>
                  {descuento && (
                    <span className="text-sm tabular-nums text-muted-foreground line-through">
                      {formatCurrency(product.precio)}
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => onAddToCart(product)}
                disabled={sinStock}
                size="lg"
                className="mt-5 w-full"
              >
                <Plus className="size-4" />
                {sinStock
                  ? 'Sin stock'
                  : enCarrito > 0
                    ? `Agregar otra (${enCarrito} en el carrito)`
                    : 'Agregar al carrito'}
              </Button>
            </div>
          </Card>

          <DiscountSummary product={product} />
        </div>
      </div>
    </div>
  )
}
