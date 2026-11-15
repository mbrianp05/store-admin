import { useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import InvoicesView from '../components/InvoicesView'
import { useAppState } from '../app-context'
import { useAuth } from '../auth-context'
import {
  puedeCambiarEstadoFactura,
  puedeVerTodasLasFacturas,
} from '../lib/roles'

export default function InvoicesPage() {
  const { user } = useAuth()
  const {
    invoices,
    loading,
    selectedInvoice,
    onSelectInvoice,
    onClearInvoiceSelection,
    onUpdateInvoiceState,
  } = useAppState()
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  // Abrir una factura desde un envío: /facturas?factura=<codigo>.
  const codigoSolicitado = search?.factura
  useEffect(() => {
    if (!codigoSolicitado || loading) return
    const factura = invoices.find(
      (invoice) => invoice.codigo === codigoSolicitado,
    )
    if (factura) onSelectInvoice(factura)
    navigate({ to: '/facturas', replace: true })
  }, [codigoSolicitado, invoices, loading, navigate, onSelectInvoice])

  return (
    <InvoicesView
      invoices={invoices}
      loading={loading}
      selectedInvoice={selectedInvoice}
      onSelect={onSelectInvoice}
      onClearSelection={onClearInvoiceSelection}
      onUpdateState={onUpdateInvoiceState}
      canUpdateState={puedeCambiarEstadoFactura(user)}
      showOwner={puedeVerTodasLasFacturas(user)}
      usuarioActual={user?.usuario || ''}
    />
  )
}
