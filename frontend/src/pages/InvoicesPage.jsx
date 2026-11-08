import InvoicesView from '../components/InvoicesView'
import { useAppState } from '../app-context'

export default function InvoicesPage() {
  const {
    invoices,
    loading,
    selectedInvoice,
    onSelectInvoice,
    onClearInvoiceSelection,
  } = useAppState()

  return (
    <InvoicesView
      invoices={invoices}
      loading={loading}
      selectedInvoice={selectedInvoice}
      onSelect={onSelectInvoice}
      onClearSelection={onClearInvoiceSelection}
    />
  )
}
