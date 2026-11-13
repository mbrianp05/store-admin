import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import Calendar from './ui/calendar'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  diasEntre,
  formatFechaCorta,
  hoyISO,
  sumarDias,
} from '@/lib/fechas'

export default function DateRangePicker({ id, desde, hasta, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState({ desde: desde || null, hasta: hasta || null })
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined

    function handlePointerDown(event) {
      if (!contenedorRef.current?.contains(event.target)) setAbierto(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [abierto])

  function alternar() {
    if (!abierto) setBorrador({ desde: desde || null, hasta: hasta || null })
    setAbierto((actual) => !actual)
  }

  function seleccionar(iso) {
    if (!borrador.desde || borrador.hasta) {
      setBorrador({ desde: iso, hasta: null })
      return
    }

    const inicio = iso < borrador.desde ? iso : borrador.desde
    const fin = iso < borrador.desde ? borrador.desde : iso
    setBorrador({ desde: inicio, hasta: fin })
    onChange({ desde: inicio, hasta: fin })
    setAbierto(false)
  }

  function aplicarPreset(dias) {
    const inicio = hoyISO()
    const fin = sumarDias(inicio, dias - 1)
    setBorrador({ desde: inicio, hasta: fin })
    onChange({ desde: inicio, hasta: fin })
    setAbierto(false)
  }

  function limpiar() {
    setBorrador({ desde: null, hasta: null })
    onChange({ desde: null, hasta: null })
  }

  const etiqueta =
    desde && hasta
      ? `${formatFechaCorta(desde)} → ${formatFechaCorta(hasta)}`
      : desde
        ? `${formatFechaCorta(desde)} → …`
        : null

  return (
    <div ref={contenedorRef} className="relative">
      <Button
        type="button"
        id={id}
        variant="outline"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className={cn(
          'h-9 w-full justify-start gap-2 bg-background/50 px-3 font-normal hover:bg-background/70',
          !etiqueta && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="size-4 shrink-0" />
        <span className="truncate">{etiqueta || 'Elige el periodo'}</span>
      </Button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Elegir periodo del descuento"
          className="animate-in fade-in-0 zoom-in-95 absolute left-0 top-full z-50 mt-1 w-[18.5rem] max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-[0_18px_50px_rgba(0,0,0,0.45)] duration-150"
        >
          <Calendar desde={borrador.desde} hasta={borrador.hasta} onSelect={seleccionar} />

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <p className="text-[11px] text-muted-foreground" aria-live="polite">
              {borrador.hasta
                ? `${diasEntre(borrador.desde, borrador.hasta)} días elegidos`
                : borrador.desde
                  ? 'Elige la fecha de fin'
                  : 'Elige la fecha de inicio'}
            </p>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => aplicarPreset(7)}
                className="h-7 px-2 text-[11px]"
              >
                7 días
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={limpiar}
                className="h-7 px-2 text-[11px]"
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
