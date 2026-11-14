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
