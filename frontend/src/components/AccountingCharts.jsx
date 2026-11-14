import { formatCurrency } from '../lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatearCompacto(valor) {
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(valor) || 0)
}

export function RevenueChart({ datos }) {
  const maximo = Math.max(0, ...datos.map((dato) => Number(dato.total) || 0))
  const total = datos.reduce((suma, dato) => suma + (Number(dato.total) || 0), 0)

  return (
    <Card className="gap-0 overflow-hidden py-0 xl:col-span-2">
      <CardHeader className="border-b border-border/70 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-highlight/15 text-highlight">
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 13V9M6 13V5M10 13V7M14 13V2" />
              </svg>
            </span>
            <div>
              <CardTitle className="text-base">Ingresos por mes</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Facturación válida de los últimos 8 meses
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Acumulado
            </p>
            <p className="text-lg font-semibold tabular-nums leading-tight">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:px-5">
        <div className="flex gap-2.5">
          <div className="flex h-44 w-11 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] tabular-nums text-muted-foreground">
            <span>{formatearCompacto(maximo)}</span>
            <span>{formatearCompacto(maximo / 2)}</span>
            <span>0</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              {[0, 50, 100].map((altura) => (
                <span
                  key={altura}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-dashed border-border/50"
                  style={{ bottom: `${altura}%` }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
                {datos.map((dato) => {
                  const valor = Number(dato.total) || 0
                  const altura = maximo ? (valor / maximo) * 100 : 0
                  return (
                    <div
                      key={dato.clave}
                      className="group relative flex h-full flex-1 items-end justify-center"
                      title={`${dato.etiqueta}: ${formatCurrency(valor)}`}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'w-full max-w-12 rounded-t-[3px] bg-gradient-to-t from-highlight/20 via-highlight/55 to-highlight transition-colors group-hover:from-highlight/30 group-hover:via-highlight/70',
                          valor === 0 && 'bg-none bg-border/40',
                        )}
                        style={{
                          height: valor > 0 ? `${Math.max(altura, 3)}%` : '2px',
                        }}
                      />
                      {valor > 0 && (
                        <span className="pointer-events-none absolute bottom-full mb-1 hidden text-[9px] font-medium tabular-nums text-foreground sm:block">
                          {formatearCompacto(valor)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-2 flex gap-1 sm:gap-2">
              {datos.map((dato) => (
                <div
                  key={dato.clave}
                  className="flex-1 text-center text-[10px] text-muted-foreground"
                >
                  {dato.etiqueta}
                </div>
              ))}
            </div>
          </div>
        </div>

        <table className="sr-only">
          <caption>Ingresos de los últimos 8 meses</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Facturas</th>
              <th scope="col">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((dato) => (
              <tr key={dato.clave}>
                <th scope="row">{dato.etiqueta}</th>
                <td>{dato.facturas}</td>
                <td>{formatCurrency(dato.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

const META_ESTADOS = {
  pendiente: {
    etiqueta: 'Pendientes',
    color: 'text-highlight',
    punto: 'bg-highlight',
  },
  en_envio: {
    etiqueta: 'En envío',
    color: 'text-sky-400',
    punto: 'bg-sky-400',
  },
  pagada: {
    etiqueta: 'Pagadas',
    color: 'text-emerald-400',
    punto: 'bg-emerald-400',
  },
  cancelada: {
    etiqueta: 'Canceladas',
    color: 'text-destructive',
    punto: 'bg-destructive',
  },
}

export function StatusDonut({ datos }) {
  const total = datos.reduce((suma, dato) => suma + dato.cantidad, 0)
  const circunferencia = 2 * Math.PI * 42
  const segmentos = datos.map((dato, indice) => {
    const fraccion = total ? dato.cantidad / total : 0
    const offset = datos
      .slice(0, indice)
      .reduce(
        (suma, previo) => suma + (total ? previo.cantidad / total : 0),
        0,
      )
    return { dato, fraccion, offset }
  })

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border/70 py-5">
        <CardTitle className="text-base">Estado de las facturas</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Distribución por estado de todas las facturas emitidas
        </p>
      </CardHeader>

      <CardContent className="px-5 py-5">
        {total === 0 ? (
          <div className="grid h-52 place-items-center text-center">
            <p className="max-w-[14rem] text-sm text-muted-foreground">
              Cuando se emitan facturas verás aquí su distribución por estado.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative size-40 shrink-0">
              <svg
                viewBox="0 0 100 100"
                className="-rotate-90"
                role="img"
                aria-label={`Distribución de ${total} facturas por estado`}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  className="text-muted/50"
                  stroke="currentColor"
                />
                {segmentos.map(({ dato, fraccion, offset }) => {
                  if (!fraccion) return null
                  return (
                    <circle
                      key={dato.estado}
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      strokeWidth="10"
                      strokeLinecap="butt"
                      stroke="currentColor"
                      strokeDasharray={`${fraccion * circunferencia} ${circunferencia}`}
                      strokeDashoffset={-offset * circunferencia}
                      className={META_ESTADOS[dato.estado]?.color}
                    />
                  )
                })}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-2xl font-semibold tabular-nums leading-none">
                    {total}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    facturas
                  </p>
                </div>
              </div>
            </div>

            <ul className="w-full min-w-0 space-y-2.5">
              {datos.map((dato) => {
                const meta = META_ESTADOS[dato.estado] || META_ESTADOS.pendiente
                const porcentaje = total
                  ? Math.round((dato.cantidad / total) * 100)
                  : 0
                return (
                  <li
                    key={dato.estado}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn('size-2 shrink-0 rounded-full', meta.punto)}
                      />
                      <span className="truncate text-muted-foreground">
                        {meta.etiqueta}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {dato.cantidad}
                      </span>{' '}
                      · {porcentaje}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TopProductsChart({ productos }) {
  const maximo = Math.max(
    0,
    ...productos.map((producto) => Number(producto.total) || 0),
  )

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border/70 py-5">
        <CardTitle className="text-base">Productos más vendidos</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Ingresos generados por producto en facturas válidas
        </p>
      </CardHeader>

      <CardContent className="px-5 py-5">
        {productos.length === 0 ? (
          <div className="grid h-44 place-items-center text-center">
            <p className="max-w-[14rem] text-sm text-muted-foreground">
              Aún no hay productos vendidos para comparar.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {productos.map((producto, indice) => {
              const valor = Number(producto.total) || 0
              const ancho = maximo ? Math.max((valor / maximo) * 100, 2) : 0
              return (
                <li key={producto.nombre}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {String(indice + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="truncate text-sm font-medium"
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(valor)}
                      </span>{' '}
                      · {producto.cantidad} u.
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-highlight/45 to-highlight"
                      style={{ width: `${ancho}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function TopClientsChart({ clientes }) {
  const maximo = Math.max(
    0,
    ...clientes.map((cliente) => Number(cliente.total) || 0),
  )

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border/70 py-5">
        <CardTitle className="text-base">Clientes con más facturación</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Ranking por total facturado, sin contar canceladas
        </p>
      </CardHeader>

      <CardContent className="px-5 py-5">
        {clientes.length === 0 ? (
          <div className="grid h-44 place-items-center text-center">
            <p className="max-w-[14rem] text-sm text-muted-foreground">
              Cuando haya clientes con facturas verás aquí su ranking.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {clientes.map((cliente, indice) => {
              const valor = Number(cliente.total) || 0
              const ancho = maximo ? Math.max((valor / maximo) * 100, 2) : 0
              const inicial = String(
                cliente.nombre || cliente.usuario || '?',
              )
                .trim()
                .slice(0, 1)
                .toUpperCase()

              return (
                <li
                  key={cliente.usuario || `cliente-${indice}`}
                  className="flex items-center gap-3"
                >
                  <span className="w-5 shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {String(indice + 1).padStart(2, '0')}
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-secondary text-[10px] font-semibold">
                    {inicial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">
                        {cliente.nombre || `@${cliente.usuario || 'cliente'}`}
                      </p>
                      <p className="shrink-0 text-xs font-semibold tabular-nums">
                        {formatCurrency(valor)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400/35 to-emerald-400"
                          style={{ width: `${ancho}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {cliente.facturas}{' '}
                        {cliente.facturas === 1 ? 'factura' : 'facturas'}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
