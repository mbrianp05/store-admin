import ProductsView from '../components/ProductsView'
import { useAppState } from '../app-context'
import { useAuth } from '../auth-context'

export default function ProductsPage() {
  const { user } = useAuth()
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
      canManage={Boolean(user)}
      canBuy={Boolean(user)}
    />
  )
}
