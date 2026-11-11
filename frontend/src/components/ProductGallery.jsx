import { useState } from 'react'
import { Image, ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function ProductGallery({ nombre, fotos = [] }) {
  const [activa, setActiva] = useState(0)
  const [fallidas, setFallidas] = useState([])

  const fotoActiva = fotos[activa]
  const mostrarFoto = fotoActiva && !fallidas.includes(fotoActiva)

  function marcarFallida(url) {
    setFallidas((actual) => (actual.includes(url) ? actual : [...actual, url]))
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="relative aspect-[4/3] bg-muted/20">
        {fotos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Image className="size-8" />
            <span className="text-xs">Este producto todavía no tiene fotos</span>
          </div>
        ) : mostrarFoto ? (
          <img
            src={fotoActiva}
            alt={`${nombre}, foto ${activa + 1}`}
            decoding="async"
            onError={() => marcarFallida(fotoActiva)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-8" />
            <span className="text-xs">No se pudo cargar esta foto</span>
          </div>
        )}

        {fotos.length > 1 && (
          <Badge variant="muted" className="absolute bottom-2 right-2">
            {activa + 1} / {fotos.length}
          </Badge>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border p-3">
          {fotos.map((foto, indice) => {
            const rota = fallidas.includes(foto)
            return (
              <button
                key={`${foto}-${indice}`}
                type="button"
                onClick={() => setActiva(indice)}
                aria-label={`Ver foto ${indice + 1} de ${nombre}`}
                aria-pressed={indice === activa}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-muted/30 transition-opacity',
                  indice === activa
                    ? 'border-primary opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                {rota ? (
                  <span className="grid h-full w-full place-items-center text-muted-foreground">
                    <ImageOff className="size-4" />
                  </span>
                ) : (
                  <img
                    src={foto}
                    alt=""
                    loading="lazy"
                    onError={() => marcarFallida(foto)}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
