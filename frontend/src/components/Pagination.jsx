import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function rangoPaginas(pagina, totalPaginas) {
  if (totalPaginas <= 5) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
  }

  const paginas = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1])
  const ordenadas = [...paginas]
    .filter((numero) => numero >= 1 && numero <= totalPaginas)
    .sort((a, b) => a - b)

  const resultado = []
  ordenadas.forEach((numero, indice) => {
    if (indice > 0 && numero - ordenadas[indice - 1] > 1) {
      resultado.push(`salto-${numero}`)
    }
    resultado.push(numero)
  })
  return resultado
}

export default function Pagination({
  pagina,
  totalPaginas,
  total,
  desde,
  hasta,
  onCambio,
  etiqueta = 'registros',
  className,
}) {
  if (totalPaginas <= 1) return null

  const paginas = rangoPaginas(pagina, totalPaginas)

  return (
    <nav
      aria-label={`Paginación de ${etiqueta}`}
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-[11px] tabular-nums text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{desde}</span>
        {'–'}
        <span className="font-medium text-foreground">{hasta}</span> de {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onCambio(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          className="size-7 text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" />
        </Button>

        {paginas.map((item) =>
          typeof item === 'number' ? (
            <Button
              key={item}
              type="button"
              variant={item === pagina ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => onCambio(item)}
              aria-label={`Página ${item}`}
              aria-current={item === pagina ? 'page' : undefined}
              className={cn(
                'size-7 text-[11px] tabular-nums',
                item === pagina
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              aria-hidden="true"
              className="px-0.5 text-[11px] text-muted-foreground"
            >
              …
            </span>
          ),
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onCambio(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Página siguiente"
          className="size-7 text-muted-foreground"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </nav>
  )
}
