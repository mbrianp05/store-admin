import { createFileRoute } from '@tanstack/react-router'
import ProductDetailPage from '../../../pages/ProductDetailPage'

export const Route = createFileRoute('/_app/productos/$nombre')({
  component: ProductDetailPage,
})
