import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, Loader2, Plus, Save, X } from 'lucide-react'
import { uploadProductPhoto } from '../api'
import { TEXTO_REPOSICION } from '../lib/stock'
import CategoryAutocomplete from './CategoryAutocomplete'
import DiscountEditor from './DiscountEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_FOTOS = 8
const MAX_BYTES = 10 * 1024 * 1024

const UNIDADES_BASE = [
  'unidad',
  'par',
  'docena',
  'metro',
  'centímetro',
  'kg',
  'gramo',
  'litro',
  'ml',
  'paquete',
  'caja',
  'rollo',
  'set',
]

const fieldClass = 'mt-1.5 bg-background/50 focus-visible:bg-background/70'

function fotosIniciales(product) {
  if (!product) return []
  const existentes = Array.isArray(product.fotos)
    ? product.fotos
    : product.foto
      ? [product.foto]
      : []
  return existentes.map((url) => ({ url, preview: url }))
}

export default function ProductForm({
  product,
  onSave,
  onClose,
  categorias = [],
  unidades = [],
}) {
  const isEditing = Boolean(product)
  const [values, setValues] = useState(() => ({
    nombre: product?.nombre ?? '',
    precio: product?.precio != null ? String(product.precio) : '',
    descripcion: product?.descripcion ?? '',
    unidad_medida: product?.unidad_medida ?? 'unidad',
    stock: product?.stock != null ? String(product.stock) : '0',
    categoria: product?.categoria ?? '',
  }))
  const [descuento, setDescuento] = useState(() =>
    product?.descuento
      ? {
          porcentaje: String(product.descuento.porcentaje ?? ''),
          desde: product.descuento.desde ?? '',
          hasta: product.descuento.hasta ?? '',
        }
      : null,
  )
  const [photos, setPhotos] = useState(() => fotosIniciales(product))
  const [reposicionPendiente, setReposicionPendiente] = useState(() =>
    Boolean(product?.reposicion_pendiente),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)
  const photosRef = useRef(photos)

  const unidadesSugeridas = useMemo(() => {
    const vistas = new Map()
    for (const unidad of [...UNIDADES_BASE, ...unidades]) {
      const valor = String(unidad || '').trim()
      if (!valor) continue
      const clave = valor.toLocaleLowerCase('es')
      if (!vistas.has(clave)) vistas.set(clave, valor)
    }
    return [...vistas.values()]
  }, [unidades])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.file) URL.revokeObjectURL(photo.preview)
      })
    }
  }, [])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleFileChange(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setError('Solo se pueden subir imágenes.')
      return
    }

    if (files.some((file) => file.size > MAX_BYTES)) {
      setError('Cada foto puede pesar hasta 10 MB.')
      return
    }

    const room = MAX_FOTOS - photos.length
    if (room <= 0) {
      setError('Puedes subir hasta 8 fotos por producto.')
      return
    }

    const next = files.slice(0, room).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((current) => [...current, ...next])
    setError(files.length > room ? 'Se agregaron las primeras 8 fotos.' : '')
  }

  function removePhoto(index) {
    setPhotos((current) => {
      const photo = current[index]
      if (photo?.file) URL.revokeObjectURL(photo.preview)
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nombre = values.nombre.trim()
    const precio = Number.parseFloat(values.precio)
    const stock = Number(values.stock)

    if (!nombre) {
      setError('Escribe un nombre para el producto.')
      return
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setError('El precio tiene que ser mayor a cero.')
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError('El stock tiene que ser un número entero mayor o igual a cero.')
      return
    }

    let descuentoPayload = null
    if (descuento) {
      const porcentaje = Number.parseFloat(descuento.porcentaje)
      if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
        setError('El descuento tiene que ser un porcentaje entre 0 y 100.')
        return
      }
      if (!descuento.desde || !descuento.hasta) {
        setError('Elige las fechas de inicio y fin del descuento.')
        return
      }
      if (descuento.desde > descuento.hasta) {
        setError('La fecha de fin del descuento no puede ser anterior al inicio.')
        return
      }
      descuentoPayload = {
        porcentaje,
        desde: descuento.desde,
        hasta: descuento.hasta,
      }
    }

    setError('')
    setSaving(true)
    let saved = false
    try {
      const urls = await Promise.all(
        photos.map(async (photo) => {
          if (photo.file) {
            const subida = await uploadProductPhoto(photo.file)
            return subida.url
          }
          return photo.url
        }),
      )
      saved = await onSave({
        nombre,
        precio,
        unidad_medida: values.unidad_medida.trim() || 'unidad',
        descripcion: values.descripcion.trim(),
        stock,
        categoria: values.categoria.trim(),
        descuento: descuentoPayload,
        reposicion_pendiente: stock === 0 ? reposicionPendiente : false,
        fotos: urls.filter(Boolean),
      })
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setSaving(false)
    }

    if (saved) onClose()
  }

  const sinStock = Number(values.stock) === 0

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 gap-0 py-0 duration-200">
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6"
        aria-label={isEditing ? 'Editar producto' : 'Nuevo producto'}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isEditing ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isEditing
                ? 'Actualiza los datos del inventario y guarda los cambios.'
                : 'Se guarda en el inventario y queda disponible para facturar.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="producto-nombre" className="mb-1.5 font-medium">
              Nombre
            </Label>
            <Input
              id="producto-nombre"
              autoFocus
              required
              value={values.nombre}
              onChange={(event) => update('nombre', event.target.value)}
              placeholder="Ej: Collar de perlas"
              className={fieldClass}
            />
          </div>

          <div>
            <Label htmlFor="producto-precio" className="mb-1.5 font-medium">
              Precio
            </Label>
            <Input
              id="producto-precio"
              required
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={values.precio}
              onChange={(event) => update('precio', event.target.value)}
              placeholder="0,00"
              className={fieldClass}
            />
          </div>

          <div>
            <Label htmlFor="producto-unidad" className="mb-1.5 font-medium">
              Unidad
            </Label>
            <Input
              id="producto-unidad"
              list="producto-unidades"
              value={values.unidad_medida}
              onChange={(event) => update('unidad_medida', event.target.value)}
              placeholder="Ej: unidad, metro, par"
              className={fieldClass}
            />
            <datalist id="producto-unidades">
              {unidadesSugeridas.map((unidad) => (
                <option key={unidad} value={unidad} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="producto-stock" className="mb-1.5 font-medium">
              Stock
            </Label>
            <Input
              id="producto-stock"
              required
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.stock}
              onChange={(event) => update('stock', event.target.value)}
              placeholder="0"
              className={fieldClass}
            />
            {sinStock && (
              <label className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={reposicionPendiente}
                  onChange={(event) => setReposicionPendiente(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span>
                  Se espera reponer el stock
                  <span className="mt-0.5 block text-[11px] leading-snug">
                    Se mostrará «{TEXTO_REPOSICION}» en el catálogo.
                  </span>
                </span>
              </label>
            )}
          </div>

          <div>
            <Label htmlFor="producto-categoria" className="mb-1.5 font-medium">
              Categoría (opcional)
            </Label>
            <CategoryAutocomplete
              id="producto-categoria"
              value={values.categoria}
              onChange={(valor) => update('categoria', valor)}
              categorias={categorias}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="producto-descripcion" className="mb-1.5 font-medium">
              Descripción (opcional)
            </Label>
            <Input
              id="producto-descripcion"
              value={values.descripcion}
              onChange={(event) => update('descripcion', event.target.value)}
              placeholder="Material, color o detalle útil"
              className={fieldClass}
            />
          </div>

          <div className="sm:col-span-2">
            <DiscountEditor
              value={descuento}
              onChange={setDescuento}
              precio={values.precio}
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label className="font-medium">Fotos (opcional)</Label>
              <span className="text-[11px] text-muted-foreground">
                {photos.length}/{MAX_FOTOS}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= MAX_FOTOS}
                className="flex aspect-square h-auto w-20 flex-col gap-1.5 border-dashed px-0 py-0 text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Image className="size-5" />
                <span className="text-[10px]">Agregar</span>
              </Button>

              {photos.map((photo, index) => (
                <div
                  key={photo.preview}
                  className="relative aspect-square w-20 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <img
                    src={photo.preview}
                    alt={`Foto ${index + 1} de ${values.nombre || 'producto'}`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute inset-x-0 bottom-0 justify-center rounded-none border-0 bg-background/80 py-0.5 text-[9px] text-foreground"
                    >
                      Portada
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePhoto(index)}
                    aria-label={`Quitar foto ${index + 1}`}
                    className="absolute right-1 top-1 size-6 rounded-full bg-background/80 p-0 text-foreground hover:bg-background hover:text-destructive"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              La primera foto se usa como portada del producto.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 border-l-2 border-destructive pl-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} aria-busy={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEditing ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar producto'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
