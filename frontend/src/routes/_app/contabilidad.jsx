import { createFileRoute } from '@tanstack/react-router'
import AccountingPage from '../../pages/AccountingPage'

export const Route = createFileRoute('/_app/contabilidad')({
  component: AccountingPage,
})
