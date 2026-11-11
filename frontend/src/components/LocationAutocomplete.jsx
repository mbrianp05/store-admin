import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { normalizarTexto } from '@/lib/text'

const MAX_SUGERENCIAS = 8

export function etiquetaUbicacion(ubicacion) {
  return `${ubicacion.municipio}, ${ubicacion.provincia}`
}

export default function LocationAutocomplete({
  id,
  value,
  onChange,
  ubicaciones = [],
  error,
  disabled = false,
}) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)

  const sugerencias = useMemo(() => {
    const buscado = normalizarTexto(value)
    const disponibles = ubicaciones
      .map((ubicacion) => ({
        ...ubicacion,
        etiqueta: etiquetaUbicacion(ubicacion),
      }))
      .filter((ubicacion) => {
        if (!buscado) return true
        return (
          normalizarTexto(ubicacion.etiqueta).includes(buscado) ||
          normalizarTexto(ubicacion.provincia).includes(buscado)
        )
      })
    return disponibles.slice(0, MAX_SUGERENCIAS)
  }, [ubicaciones, value])

  const listboxId = `${id}-listbox`
  const mostrarLista = abierto && !disabled

  function seleccionar(etiqueta) {
    onChange(etiqueta)
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
        seleccionar(sugerencias[activo].etiqueta)
      }
    } else if (event.key === 'Escape') {
      setAbierto(false)
      setActivo(-1)
    }
  }

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostrarLista}
        aria-controls={listboxId}
        aria-activedescendant={
          activo >= 0 ? `${listboxId}-${activo}` : undefined
        }
        aria-invalid={Boolean(error)}
        autoComplete="off"
        placeholder="Municipio, provincia"
        value={value}
        disabled={disabled}
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
        className={cn('pl-9', error && 'border-destructive focus-visible:ring-destructive/30')}
      />

      {mostrarLista && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Municipios de Cuba"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {sugerencias.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No encontramos ese municipio en Cuba.
            </p>
          ) : (
            sugerencias.map((ubicacion, indice) => (
              <button
                key={ubicacion.etiqueta}
                id={`${listboxId}-${indice}`}
                type="button"
                role="option"
                aria-selected={indice === activo}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActivo(indice)}
                onClick={() => seleccionar(ubicacion.etiqueta)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                  indice === activo
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground',
                )}
              >
                <span className="truncate">{ubicacion.municipio}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ubicacion.provincia}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
