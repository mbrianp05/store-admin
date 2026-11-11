import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { formatMes, hoyISO, isoLocal, parseFechaISO } from '@/lib/fechas'

const DIAS_SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']

function inicioDeMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1, 12)
}

function celdasDelMes(mes) {
  const primero = inicioDeMes(mes)
  const desplazamiento = (primero.getDay() + 6) % 7 // lunes = 0
  const inicio = new Date(primero)
  inicio.setDate(primero.getDate() - desplazamiento)

  return Array.from({ length: 42 }, (_, indice) => {
    const fecha = new Date(inicio)
    fecha.setDate(inicio.getDate() + indice)
    return fecha
  })
}

export default function Calendar({ desde, hasta, onSelect }) {
  const [mes, setMes] = useState(() => inicioDeMes(parseFechaISO(desde) || new Date()))
  const celdas = celdasDelMes(mes)
  const hoy = hoyISO()

  function moverMes(delta) {
    setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1, 12))
  }

  function seleccionar(fecha) {
    const iso = isoLocal(fecha)
    if (fecha.getMonth() !== mes.getMonth() || fecha.getFullYear() !== mes.getFullYear()) {
      setMes(inicioDeMes(fecha))
    }
    onSelect(iso)
  }

  return (
    <div className="w-full select-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => moverMes(-1)}
          aria-label="Mes anterior"
          className="size-7 text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium tracking-tight" aria-live="polite">
          {formatMes(mes)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => moverMes(1)}
          aria-label="Mes siguiente"
          className="size-7 text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_SEMANA.map((dia) => (
          <span
            key={dia}
            aria-hidden="true"
            className="py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {dia}
          </span>
        ))}

        {celdas.map((fecha) => {
          const iso = isoLocal(fecha)
          const fueraDelMes =
            fecha.getMonth() !== mes.getMonth() || fecha.getFullYear() !== mes.getFullYear()
          const esInicio = iso === desde
          const esFin = iso === hasta
          const enRango = Boolean(desde && hasta && iso > desde && iso < hasta)
          const esHoy = iso === hoy

          return (
            <button
              key={iso}
              type="button"
              onClick={() => seleccionar(fecha)}
              aria-pressed={esInicio || esFin}
              aria-label={iso}
              className={cn(
                'relative grid h-8 place-items-center rounded-md text-sm tabular-nums transition-colors',
                fueraDelMes && 'text-muted-foreground/40',
                !fueraDelMes &&
                  !esInicio &&
                  !esFin &&
                  !enRango &&
                  'text-foreground hover:bg-accent',
                enRango && 'bg-primary/15 text-foreground',
                (esInicio || esFin) &&
                  'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                esHoy && !esInicio && !esFin && 'ring-1 ring-border',
              )}
            >
              {fecha.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
