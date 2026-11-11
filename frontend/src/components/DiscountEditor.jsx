import { Percent, Plus, Trash2 } from 'lucide-react'
import DateRangePicker from './DateRangePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '../lib/format'
import { hoyISO, sumarDias } from '../lib/fechas'

export default function DiscountEditor({ value, onChange, precio }) {
  const activo = Boolean(value)

  function agregar() {
    const hoy = hoyISO()
    onChange({ porcentaje: '10', desde: hoy, hasta: sumarDias(hoy, 6) })
  }

  function actualizar(campo, dato) {
    onChange({ ...value, [campo]: dato })
  }

  const porcentaje = Number.parseFloat(value?.porcentaje)
  const precioBase = Number.parseFloat(precio)
  const precioEstimado =
    activo &&
    Number.isFinite(porcentaje) &&
    porcentaje > 0 &&
    porcentaje < 100 &&
    Number.isFinite(precioBase) &&
    precioBase > 0
      ? Math.round(((precioBase * (100 - porcentaje)) / 100) * 100) / 100
      : null

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-highlight/10 text-highlight">
            <Percent className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Descuento por periodo</p>
            <p className="text-xs text-muted-foreground">
              Se aplica automáticamente entre las fechas elegidas.
            </p>
          </div>
        </div>

        {activo ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="self-start text-muted-foreground hover:text-destructive sm:self-auto"
          >
            <Trash2 className="size-3.5" />
            Quitar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={agregar}
            className="self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            Agregar descuento
          </Button>
        )}
      </div>

      {activo && (
        <div className="mt-4 grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <div>
            <Label htmlFor="producto-descuento" className="mb-1.5 font-medium">
              Descuento
            </Label>
            <div className="relative">
              <Input
                id="producto-descuento"
                type="number"
                min="0.01"
                max="99.99"
                step="0.01"
                inputMode="decimal"
                value={value.porcentaje}
                onChange={(event) => actualizar('porcentaje', event.target.value)}
                placeholder="10"
                className="bg-background/50 pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="producto-periodo" className="mb-1.5 font-medium">
              Periodo
            </Label>
            <DateRangePicker
              id="producto-periodo"
              desde={value.desde}
              hasta={value.hasta}
              onChange={({ desde, hasta }) =>
                onChange({ ...value, desde: desde || '', hasta: hasta || '' })
              }
            />
          </div>

          {precioEstimado !== null && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Precio con descuento:{' '}
              <span className="font-medium text-highlight">
                {formatCurrency(precioEstimado)}
              </span>{' '}
              (antes {formatCurrency(precioBase)}).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
