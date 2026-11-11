import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppStateContext } from "./app-context";
import { useAuth } from "./auth-context";
import {
  createInvoice,
  createProduct,
  deleteProduct,
  getInvoices,
  getProducts,
  updateProduct,
} from "./api";
import CartPanel from "./components/CartPanel";
import Masthead from "./components/Masthead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function App() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const notify = useCallback((message, tone = "success") => {
    if (tone === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [productsData, invoicesData] = await Promise.all([
        getProducts(),
        getInvoices(),
      ]);
      setProducts(productsData);
      setInvoices(invoicesData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- carga inicial desde la API
    fetchData();
  }, [fetchData]);

  const reloadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchData();
  }, [fetchData]);

  const addToCart = useCallback(
    (product) => {
      const disponible = Number(product.stock) || 0;
      const enCarrito = cart
        .filter((item) => item.producto.nombre === product.nombre)
        .reduce((total, item) => total + item.cantidad, 0);

      if (enCarrito + 1 > disponible) {
        notify(
          disponible === 0
            ? `"${product.nombre}" no tiene stock disponible.`
            : `No podés agregar más de "${product.nombre}". Stock disponible: ${disponible}.`,
          "error",
        );
        return;
      }

      setCart((current) => {
        const existing = current.find(
          (item) => item.producto.nombre === product.nombre,
        );
        if (existing) {
          return current.map((item) =>
            item.producto.nombre === product.nombre
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          );
        }
        return [...current, { producto: product, cantidad: 1 }];
      });
    },
    [cart, notify],
  );

  const changeQuantity = useCallback(
    (nombre, delta) => {
      const item = cart.find((entry) => entry.producto.nombre === nombre);
      if (delta > 0 && item) {
        const disponible = Number(item.producto.stock) || 0;
        if (item.cantidad + delta > disponible) {
          notify(
            `No podés superar el stock de "${nombre}". Disponible: ${disponible}.`,
            "error",
          );
          return;
        }
      }

      setCart((current) =>
        current.flatMap((entry) => {
          if (entry.producto.nombre !== nombre) return [entry];
          const cantidad = entry.cantidad + delta;
          return cantidad > 0 ? [{ ...entry, cantidad }] : [];
        }),
      );
    },
    [cart, notify],
  );

  const removeFromCart = useCallback((nombre) => {
    setCart((current) =>
      current.filter((item) => item.producto.nombre !== nombre),
    );
  }, []);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;

    const sinStock = cart.find(
      (item) => item.cantidad > (Number(item.producto.stock) || 0),
    );
    if (sinStock) {
      notify(
        `No hay stock suficiente de "${sinStock.producto.nombre}". Disponible: ${Number(sinStock.producto.stock) || 0}.`,
        "error",
      );
      return;
    }

    setCheckingOut(true);
    try {
      const invoice = await createInvoice(cart);
      setProducts((current) =>
        current.map((product) => {
          const item = cart.find(
            (entry) => entry.producto.nombre === product.nombre,
          );
          if (!item) return product;
          return {
            ...product,
            stock: Math.max(0, (Number(product.stock) || 0) - item.cantidad),
          };
        }),
      );
      setInvoices((current) => [...current, invoice]);
      setSelectedInvoice(invoice);
      setCart([]);
      setCartOpen(false);
      notify(`Factura #${invoice.numero} emitida.`);
      navigate({ to: "/facturas" });
    } catch (checkoutError) {
      notify(checkoutError.message, "error");
    } finally {
      setCheckingOut(false);
    }
  }, [cart, navigate, notify]);

  const handleCreateProduct = useCallback(
    async (product) => {
      try {
        const created = await createProduct(product);
        setProducts((current) => [...current, created]);
        notify(`"${created.nombre}" se agregó al inventario.`);
        return true;
      } catch (createError) {
        notify(createError.message, "error");
        return false;
      }
    },
    [notify],
  );

  const handleUpdateProduct = useCallback(
    async (nombreOriginal, product) => {
      try {
        const updated = await updateProduct(nombreOriginal, product);
        setProducts((current) =>
          current.map((item) =>
            item.nombre === nombreOriginal ? updated : item,
          ),
        );
        setCart((current) =>
          current.map((item) =>
            item.producto.nombre === nombreOriginal
              ? { ...item, producto: updated }
              : item,
          ),
        );
        notify(`"${updated.nombre}" se actualizó.`);
        return true;
      } catch (updateError) {
        notify(updateError.message, "error");
        return false;
      }
    },
    [notify],
  );

  const handleDeleteProduct = useCallback(
    async (nombre) => {
      try {
        await deleteProduct(nombre);
        setProducts((current) =>
          current.filter((product) => product.nombre !== nombre),
        );
        setCart((current) =>
          current.filter((item) => item.producto.nombre !== nombre),
        );
        notify(`"${nombre}" se eliminó del inventario.`);
      } catch (deleteError) {
        notify(deleteError.message, "error");
      }
    },
    [notify],
  );

  const cartCount = cart.reduce((total, item) => total + item.cantidad, 0);

  const cartPanelProps = {
    cart,
    onIncrement: (nombre) => changeQuantity(nombre, 1),
    onDecrement: (nombre) => changeQuantity(nombre, -1),
    onRemove: removeFromCart,
    onCheckout: handleCheckout,
    checkingOut,
  };

  const appState = {
    products,
    invoices,
    cart,
    search,
    loading,
    selectedInvoice,
    onSearchChange: setSearch,
    onAddToCart: addToCart,
    onDeleteProduct: handleDeleteProduct,
    onCreateProduct: handleCreateProduct,
    onUpdateProduct: handleUpdateProduct,
    onSelectInvoice: setSelectedInvoice,
    onClearInvoiceSelection: () => setSelectedInvoice(null),
  };

  return (
    <div className="min-h-screen bg-background">
      <Masthead
        productCount={products.length}
        invoiceCount={invoices.length}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        user={user}
        onLogout={logout}
      />

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>No se pudo cargar la información: {error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reloadData}
                className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <main className="min-w-0 py-6 sm:py-8">
          <AppStateContext.Provider value={appState}>
            <Outlet />
          </AppStateContext.Provider>
        </main>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[88%] max-w-[19rem] border-0 bg-transparent p-0 shadow-none sm:max-w-[19rem]"
        >
          <CartPanel
            {...cartPanelProps}
            onClose={() => setCartOpen(false)}
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
