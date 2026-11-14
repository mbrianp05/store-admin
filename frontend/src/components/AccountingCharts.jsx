import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const COLORES = {
  highlight: '#e3bd63',
  emerald: '#34d399',
  sky: '#38bdf8',
  destructive: '#f87171',
  grid: '#27272a',
  muted: '#71717a',
}

const META_ESTADOS = {
  pendiente: {
    etiqueta: 'Pendientes',
    color: COLORES.highlight,
    clase: 'text-highlight',
    punto: 'bg-highlight',
  },
  en_envio: {
    etiqueta: 'En envío',
    color: COLORES.sky,
    clase: 'text-sky-400',
    punto: 'bg-sky-400',
  },
  pagada: {
    etiqueta: 'Pagadas',
    color: COLORES.emerald,
    clase: 'text-emerald-400',
    punto: 'bg-emerald-400',
  },
  cancelada: {
    etiqueta: 'Canceladas',
    color: COLORES.destructive,
    clase: 'text-destructive',
    punto: 'bg-destructive',
  },
}

function formatearCompacto(valor) {
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(valor) || 0)
}

function ChartTooltip({ active, payload, titulo, detalle }) {
  if (!active || !payload?.length) return null
  const dato = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-popover-foreground">{titulo(dato)}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">{detalle(dato)}</p>
    </div>
  )
}

function EjeMoneda({ valor }) {
  return `${formatearCompacto(valor)} $`
}

export function RevenueChart({ datos, className }) {
  const total = datos.reduce((suma, dato) => suma + (Number(dato.total) || 0), 0)

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Ingresos por mes</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Facturación válida de los últimos 8 meses
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Acumulado
            </p>
            <p className="text-base font-semibold leading-tight tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 py-3 sm:px-3">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={datos}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ingresos-ventura" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORES.highlight} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORES.highlight} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={COLORES.grid}
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLORES.muted, fontSize: 10 }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: COLORES.muted, fontSize: 10 }}
                tickFormatter={EjeMoneda}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: COLORES.highlight, strokeOpacity: 0.35 }}
                content={
                  <ChartTooltip
                    titulo={(dato) => dato.etiqueta}
                    detalle={(dato) =>
                      `${formatCurrency(dato.total)} · ${dato.facturas} ${
                        dato.facturas === 1 ? 'factura' : 'facturas'
                      }`
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={COLORES.highlight}
                strokeWidth={2}
                fill="url(#ingresos-ventura)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusDonut({ datos, className }) {
  const total = datos.reduce((suma, dato) => suma + dato.cantidad, 0)
  const visibles = datos.map((dato) => ({
    ...dato,
    etiqueta: META_ESTADOS[dato.estado]?.etiqueta || dato.estado,
    color: META_ESTADOS[dato.estado]?.color || COLORES.muted,
  }))

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <CardTitle className="text-sm">Estado de las facturas</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Distribución de todas las facturas emitidas
        </p>
      </CardHeader>

      <CardContent className="px-4 py-3">
        {total === 0 ? (
          <div className="grid h-52 place-items-center text-center">
            <p className="max-w-[13rem] text-xs text-muted-foreground">
              Cuando se emitan facturas verás aquí su distribución por estado.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visibles}
                    dataKey="cantidad"
                    nameKey="etiqueta"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {visibles.map((dato) => (
                      <Cell key={dato.estado} fill={dato.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        titulo={(dato) => dato.etiqueta}
                        detalle={(dato) =>
                          `${dato.cantidad} ${
                            dato.cantidad === 1 ? 'factura' : 'facturas'
                          } · ${formatCurrency(dato.total)}`
                        }
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-2xl font-semibold leading-none tabular-nums">
                    {total}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                    facturas
                  </p>
                </div>
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-2">
              {visibles.map((dato) => {
                const porcentaje = total
                  ? Math.round((dato.cantidad / total) * 100)
                  : 0
                return (
                  <li
                    key={dato.estado}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          META_ESTADOS[dato.estado]?.punto,
                        )}
                      />
                      <span className="truncate text-muted-foreground">
                        {dato.etiqueta}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
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

export function TopProductsChart({ productos, className }) {
  const datos = productos.map((producto) => ({
    ...producto,
    nombreCorto:
      producto.nombre.length > 16
        ? `${producto.nombre.slice(0, 15)}…`
        : producto.nombre,
  }))

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <CardTitle className="text-sm">Productos que más dinero dejaron</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Ingresos por producto en facturas válidas
        </p>
      </CardHeader>

      <CardContent className="px-3 py-3 sm:px-4">
        {productos.length === 0 ? (
          <div className="grid h-44 place-items-center text-center">
            <p className="max-w-[14rem] text-xs text-muted-foreground">
              Aún no hay productos vendidos para comparar.
            </p>
          </div>
        ) : (
          <>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datos}
                  layout="vertical"
                  margin={{ top: 0, right: 18, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={COLORES.grid}
                    strokeDasharray="3 4"
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={92}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORES.muted, fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={
                      <ChartTooltip
                        titulo={(dato) => dato.nombre}
                        detalle={(dato) =>
                          `${formatCurrency(dato.total)} · ${dato.cantidad} ${
                            dato.cantidad === 1 ? 'unidad' : 'unidades'
                          }`
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill={COLORES.highlight}
                    radius={[0, 4, 4, 0]}
                    barSize={13}
                  >
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(valor) => `${formatearCompacto(valor)} $`}
                      fill="#fafafa"
                      fontSize={9}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 overflow-x-auto border-t border-border/70 pt-1">
              <table className="w-full min-w-[24rem] text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-1.5 pr-2 font-medium">
                      #
                    </th>
                    <th scope="col" className="py-1.5 pr-2 font-medium">
                      Producto
                    </th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                      Unidades
                    </th>
                    <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                      Ingresos
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto, indice) => (
                    <tr
                      key={producto.nombre}
                      className="border-t border-border/50"
                    >
                      <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">
                        {String(indice + 1).padStart(2, '0')}
                      </td>
                      <td
                        className="max-w-[11rem] truncate py-1.5 pr-2 font-medium"
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                        {producto.cantidad}
                      </td>
                      <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                        {formatCurrency(producto.total)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                        {producto.participacion}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function TopClientsChart({ clientes, className }) {
  const datos = clientes.map((cliente, indice) => ({
    ...cliente,
    nombreCorto:
      (cliente.nombre || `@${cliente.usuario || 'cliente'}`).length > 14
        ? `${(cliente.nombre || `@${cliente.usuario}`).slice(0, 13)}…`
        : cliente.nombre || `@${cliente.usuario || 'cliente'}`,
    inicial: String(cliente.nombre || cliente.usuario || '?')
      .trim()
      .slice(0, 1)
      .toUpperCase(),
    posicion: indice + 1,
  }))

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <CardTitle className="text-sm">Clientes con más facturación</CardTitle>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Ranking por total facturado, sin contar canceladas
        </p>
      </CardHeader>

      <CardContent className="px-4 py-3">
        {clientes.length === 0 ? (
          <div className="grid h-44 place-items-center text-center">
            <p className="max-w-[14rem] text-xs text-muted-foreground">
              Cuando haya clientes con facturas verás aquí su ranking.
            </p>
          </div>
        ) : (
          <>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datos}
                  layout="vertical"
                  margin={{ top: 0, right: 18, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={COLORES.grid}
                    strokeDasharray="3 4"
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={82}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORES.muted, fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={
                      <ChartTooltip
                        titulo={(dato) =>
                          dato.nombre || `@${dato.usuario || 'cliente'}`
                        }
                        detalle={(dato) =>
                          `${formatCurrency(dato.total)} · ${dato.facturas} ${
                            dato.facturas === 1 ? 'factura' : 'facturas'
                          }`
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill={COLORES.emerald}
                    radius={[0, 4, 4, 0]}
                    barSize={13}
                  >
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(valor) => `${formatearCompacto(valor)} $`}
                      fill="#fafafa"
                      fontSize={9}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-2 space-y-1.5 border-t border-border/70 pt-2">
              {datos.map((cliente) => (
                <li
                  key={cliente.usuario || `cliente-${cliente.posicion}`}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-secondary text-[9px] font-semibold">
                    {cliente.inicial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {cliente.nombre || `@${cliente.usuario || 'cliente'}`}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCurrency(cliente.total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
