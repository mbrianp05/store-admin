import { createFileRoute } from '@tanstack/react-router'
import EnviosPage from '../../pages/EnviosPage'

export const Route = createFileRoute('/_app/envios')({
  component: EnviosPage,
})
