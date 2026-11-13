import { useId, useMemo } from 'react'
import { qrcodegen } from '../lib/qrcodegen'
import { cn } from '@/lib/utils'

function construirMatriz(texto) {
  const qr = qrcodegen.QrCode.encodeText(
    texto || 'VENTURE',
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

// Grietas en zigzag que atraviesan el QR y lo parten en dos.
function construirGrietas(size) {
  const principal = [
    [0.92, -0.1],
    [0.79, 0.13],
    [0.86, 0.25],
    [0.63, 0.39],
    [0.73, 0.53],
    [0.49, 0.67],
    [0.57, 0.79],
    [0.35, 1.1],
  ]

  const rama = [
    [0.63, 0.39],
    [0.4, 0.31],
    [0.31, 0.19],
  ]

  function aPath(puntos) {
    return puntos
      .map(
        ([x, y], indice) =>
          `${indice === 0 ? 'M' : 'L'}${x * size} ${y * size}`,
      )
      .join(' ')
  }

  return [aPath(principal), aPath(rama)]
}

export default function InvoiceQR({ value, codigo, className, anulado = false }) {
  const { size, path } = useMemo(
    () => construirMatriz(value || codigo || ''),
    [value, codigo],
  )
  const grietas = useMemo(() => construirGrietas(size), [size])
  const unico = useId().replace(/:/g, '')
  const gradienteId = `qr-grises-${unico}`
  const mascaraId = `qr-grieta-${unico}`

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-lg p-3 shadow-sm',
          anulado
            ? 'bg-zinc-200 ring-1 ring-zinc-500/50'
            : 'bg-white',
        )}
      >
        <svg
          role="img"
          aria-label={`Código QR ${anulado ? 'anulado ' : ''}de la factura ${codigo || ''}`.trim()}
          viewBox={`-4 -4 ${size + 8} ${size + 8}`}
          className={cn('size-36', anulado && '-rotate-1')}
          shapeRendering="crispEdges"
        >
          {anulado && (
            <defs>
              <linearGradient
                id={gradienteId}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="45%" stopColor="#3f3f46" />
                <stop offset="100%" stopColor="#52525b" />
              </linearGradient>
              <mask
                id={mascaraId}
                maskUnits="userSpaceOnUse"
                x={-4}
                y={-4}
                width={size + 8}
                height={size + 8}
              >
                <rect
                  x={-4}
                  y={-4}
                  width={size + 8}
                  height={size + 8}
                  fill="white"
                />
                {grietas.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </mask>
            </defs>
          )}

          <g mask={anulado ? `url(#${mascaraId})` : undefined}>
            <path
              d={path}
              fill={anulado ? `url(#${gradienteId})` : '#111113'}
            />
          </g>

          {anulado && (
            <g
              fill="none"
              stroke="#71717a"
              strokeWidth="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
              transform="translate(0.5 0.5)"
            >
              {grietas.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          )}
        </svg>
      </div>
      {codigo && (
        <p className="text-[11px] text-muted-foreground">
          Código{' '}
          <span
            className={cn(
              'font-mono font-medium tracking-wide',
              anulado ? 'text-zinc-400 line-through decoration-zinc-500' : 'text-foreground',
            )}
          >
            {codigo}
          </span>
        </p>
      )}
    </div>
  )
}
