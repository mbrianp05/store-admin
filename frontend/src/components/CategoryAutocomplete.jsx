import { useMemo, useState } from 'react'
import { Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { normalizarTexto } from '@/lib/text'

const MAX_SUGERENCIAS = 8

export default function CategoryAutocomplete({
  id,
  value,
  onChange,
  categorias = [],
  placeholder = 'Ej: Collares, Herramientas…',
}) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)

  const sugerencias = useMemo(() => {
    const buscado = normalizarTexto(value)
    return categorias
      .filter((categoria) => !buscado || normalizarTexto(categoria).includes(buscado))
      .slice(0, MAX_SUGERENCIAS)
  }, [categorias, value])

  const esNueva =
    value.trim().length > 0 &&
    !categorias.some((categoria) => normalizarTexto(categoria) === normalizarTexto(value))

  const listboxId = `${id}-listbox`
  const mostrarLista = abierto

  function seleccionar(categoria) {
    onChange(categoria)
    setAbierto(false)
    setActivo(-1)
  }

  function handleKeyDown(event) {
    if (!mostrarLista) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setAbierto(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActivo((actual) =>
        sugerencias.length === 0 ? -1 : (actual + 1) % sugerencias.length,
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActivo((actual) =>
        sugerencias.length === 0
          ? -1
          : (actual - 1 + sugerencias.length) % sugerencias.length,
      )
    } else if (event.key === 'Enter') {
      if (activo >= 0 && sugerencias[activo]) {
        event.preventDefault()
        seleccionar(sugerencias[activo])
      } else {
        setAbierto(false)
      }
    } else if (event.key === 'Escape') {
      setAbierto(false)
      setActivo(-1)
    }
  }

  return (
    <div className="relative">
      <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostrarLista}
        aria-controls={listboxId}
        aria-activedescendant={activo >= 0 ? `${listboxId}-${activo}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setAbierto(true)
          setActivo(-1)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false)
          setActivo(-1)
        }}
        onKeyDown={handleKeyDown}
        className="bg-background/50 pl-9"
      />

      {mostrarLista && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Categorías existentes"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {sugerencias.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Todavía no hay categorías que coincidan.
            </p>
          ) : (
            sugerencias.map((categoria, indice) => (
              <button
                key={categoria}
                id={`${listboxId}-${indice}`}
                type="button"
                role="option"
                aria-selected={indice === activo}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActivo(indice)}
                onClick={() => seleccionar(categoria)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                  indice === activo
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground',
                )}
              >
                <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{categoria}</span>
              </button>
            ))
          )}

          {esNueva && (
            <p className="mt-1 border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">
              Se guardará como categoría nueva: «{value.trim()}».
            </p>
          )}
        </div>
      )}
    </div>
  )
}
