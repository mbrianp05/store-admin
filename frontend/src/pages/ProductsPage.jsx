import ProductsView from '../components/ProductsView'
import { useAppState } from '../app-context'

export default function ProductsPage() {
  const {
    products,
    cart,
    search,
    loading,
    onSearchChange,
    onAddToCart,
    onCreateProduct,
  } = useAppState()

  return (
    <ProductsView
      products={products}
      loading={loading}
      search={search}
      onSearchChange={onSearchChange}
      cart={cart}
      onAddToCart={onAddToCart}
      onCreate={onCreateProduct}
    />
  )
}
