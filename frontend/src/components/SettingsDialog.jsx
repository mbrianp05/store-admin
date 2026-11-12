import { useState } from 'react'
import { Truck } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsDialog({ open, onOpenChange, costoEnvio, onSave }) {
  const [valor, setValor] = useState(String(costoEnvio ?? 0))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const numero = Number(String(valor).replace(',', '.'))
  const valido = Number.isFinite(numero) && numero >= 0

  async function guardar(event) {
    event.preventDefault()
    if (!valido) {
      setError('Ingresá un monto válido, mayor o igual a cero.')
      return
    }

    setGuardando(true)
    const ok = await onSave(Math.round(numero * 100) / 100)
    setGuardando(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-1 grid size-9 place-items-center rounded-lg bg-highlight/15 text-highlight">
            <Truck className="size-4" />
          </span>
          <DialogTitle>Configuración de envío</DialogTitle>
          <DialogDescription>
            Definí la tasa fija que se suma a las facturas con envío a domicilio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="costo-envio">Costo fijo de envío</Label>
            <Input
              id="costo-envio"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={valor}
              onChange={(event) => {
                setValor(event.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
              className="tabular-nums"
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {valido
                  ? `Cada envío costará ${formatCurrency(numero)}.`
                  : 'El costo debe ser un número mayor o igual a cero.'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando || !valido}>
              {guardando ? 'Guardando…' : 'Guardar tasa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
