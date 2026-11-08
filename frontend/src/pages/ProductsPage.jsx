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
    onDeleteProduct,
    onCreateProduct,
    onUpdateProduct,
  } = useAppState()

  return (
    <ProductsView
      products={products}
      loading={loading}
      search={search}
      onSearchChange={onSearchChange}
      cart={cart}
      onAddToCart={onAddToCart}
      onDelete={onDeleteProduct}
      onCreate={onCreateProduct}
      onUpdate={onUpdateProduct}
    />
  )
}
