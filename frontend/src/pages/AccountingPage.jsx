import { useCallback, useEffect, useState } from 'react'
import {
  CircleDollarSign,
  LoaderCircle,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getAccounting } from '../api'
import {
  RevenueChart,
  StatusDonut,
  TopClientsChart,
  TopProductsChart,
} from '../components/AccountingCharts'
import { formatCurrency, formatDate } from '../lib/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ESTADOS_BADGE = {
  pendiente: {
    etiqueta: 'Pendiente',
    clase: 'border-highlight/40 bg-highlight/15 text-highlight',
  },
  en_envio: {
    etiqueta: 'En envío',
    clase: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  },
  pagada: {
    etiqueta: 'Pagada',
    clase: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
  cancelada: {
    etiqueta: 'Cancelada',
    clase: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
}

function EstadoBadge({ estado }) {
  const info = ESTADOS_BADGE[estado] || ESTADOS_BADGE.pendiente
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        info.clase,
      )}
    >
      {info.etiqueta}
    </span>
  )
}

function KpiCard({ icon: Icon, etiqueta, valor, detalle, tono }) {
  return (
    <Card className="gap-0 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{etiqueta}</p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight">
            {valor}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {detalle}
          </p>
        </div>
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg border',
            tono,
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
    </Card>
  )
}

function AccountingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[86px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-64 rounded-xl xl:col-span-3" />
        <Skeleton className="h-64 rounded-xl xl:col-span-2" />
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-80 rounded-xl xl:col-span-3" />
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
      </div>
    </div>
  )
}

export default function AccountingPage() {
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDatos(await getAccounting())
    } catch (cargaError) {
      setError(cargaError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga inicial desde la API
    cargar()
  }, [cargar])

  const resumen = datos?.resumen

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Contabilidad
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Facturación, cobros, productos y clientes que más pesan en Venture.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] text-emerald-300"
          >
            <ShieldCheck className="size-3" />
            Solo administración
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cargar}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Actualizar
          </Button>
        </div>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>No se pudo cargar la contabilidad: {error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cargar}
              className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !datos ? (
        <AccountingSkeleton />
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={CircleDollarSign}
              etiqueta="Facturación total"
              valor={formatCurrency(resumen.total_facturado)}
              detalle={`${resumen.facturas_validas} ${
                resumen.facturas_validas === 1
                  ? 'factura válida'
                  : 'facturas válidas'
              }`}
              tono="border-highlight/30 bg-highlight/10 text-highlight"
            />
            <KpiCard
              icon={Wallet}
              etiqueta="Cobrado"
              valor={formatCurrency(resumen.total_cobrado)}
              detalle={`${resumen.porcentaje_cobrado}% del total facturado`}
              tono="border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            />
            <KpiCard
              icon={PiggyBank}
              etiqueta="Por cobrar"
              valor={formatCurrency(resumen.total_pendiente)}
              detalle={`${resumen.facturas_pendientes} ${
                resumen.facturas_pendientes === 1
                  ? 'factura en curso'
                  : 'facturas en curso'
              }`}
              tono="border-sky-400/30 bg-sky-400/10 text-sky-300"
            />
            <KpiCard
              icon={TrendingUp}
              etiqueta="Ticket promedio"
              valor={formatCurrency(resumen.ticket_promedio)}
              detalle={`${resumen.clientes} ${
                resumen.clientes === 1 ? 'cliente activo' : 'clientes activos'
              }`}
              tono="border-border bg-muted/40 text-foreground"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <RevenueChart
              datos={datos.por_mes}
              className="xl:col-span-3"
            />
            <StatusDonut datos={datos.por_estado} className="xl:col-span-2" />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <TopProductsChart
              productos={datos.top_productos}
              className="xl:col-span-3"
            />
            <TopClientsChart
              clientes={datos.top_clientes}
              className="xl:col-span-2"
            />
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-border/70 px-4 py-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground">
                    <ReceiptText className="size-3.5" />
                  </span>
                  <div>
                    <CardTitle className="text-sm">Últimas facturas</CardTitle>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Movimientos recientes de todas las cuentas
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{resumen.facturas_total} emitidas</span>
                  <span aria-hidden="true">·</span>
                  <span>{resumen.productos_vendidos} unidades vendidas</span>
                  {resumen.facturas_canceladas > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{resumen.facturas_canceladas} canceladas</span>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            {datos.ultimas_facturas.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                  <ReceiptText className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">Sin movimientos</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
                  La contabilidad empezará a llenarse cuando se emita la primera
                  factura.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-4 py-2 font-medium">
                        Factura
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Cliente
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Estado
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right font-medium"
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.ultimas_facturas.map((factura) => (
                      <tr
                        key={`${factura.usuario}-${factura.numero}-${factura.fecha}`}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-4 py-2 font-semibold tabular-nums">
                          #{factura.numero}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                          {formatDate(factura.fecha)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {factura.usuario ? `@${factura.usuario}` : 'Sin cuenta'}
                        </td>
                        <td className="px-4 py-2">
                          <EstadoBadge estado={factura.estado} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">
                          {formatCurrency(factura.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Los totales de facturación, ticket promedio y rankings excluyen las
            facturas canceladas. «Por cobrar» agrupa las facturas pendientes y en
            envío.
          </p>
        </>
      )}
    </div>
  )
}
