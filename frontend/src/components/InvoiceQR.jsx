import { useMemo } from 'react'
import { qrcodegen } from '../lib/qrcodegen'
import { cn } from '@/lib/utils'

function construirMatriz(texto) {
  const qr = qrcodegen.QrCode.encodeText(
    texto || 'MOSTRADOR',
    qrcodegen.QrCode.Ecc.MEDIUM,
  )
  const size = qr.size
  const partes = []

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.getModule(x, y)) {
        partes.push(`M${x} ${y}h1v1h-1z`)
      }
    }
  }

  return { size, path: partes.join('') }
}

export default function InvoiceQR({ value, codigo, className }) {
  const { size, path } = useMemo(
    () => construirMatriz(value || codigo || ''),
    [value, codigo],
  )

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="rounded-lg bg-white p-3 shadow-sm">
        <svg
          role="img"
          aria-label={`Código QR de la factura ${codigo || ''}`.trim()}
          viewBox={`-4 -4 ${size + 8} ${size + 8}`}
          className="size-36"
          shapeRendering="crispEdges"
        >
          <path d={path} fill="#111113" />
        </svg>
      </div>
      {codigo && (
        <p className="text-[11px] text-muted-foreground">
          Código{' '}
          <span className="font-mono font-medium tracking-wide text-foreground">
            {codigo}
          </span>
        </p>
      )}
    </div>
  )
}
