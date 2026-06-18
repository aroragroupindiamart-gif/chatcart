import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Product } from "@/lib/api";

export interface CartItem {
  product: Product;
  variantSelections: Record<string, string>;
  quantity: number;
  key: string;
}

function makeKey(productId: number, variants: Record<string, string>): string {
  const variantStr = Object.entries(variants)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `${productId}__${variantStr}`;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addToCart: (product: Product, variants: Record<string, string>, qty?: number) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback(
    (product: Product, variantSelections: Record<string, string>, qty = 1) => {
      const key = makeKey(product.id, variantSelections);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + qty } : i
          );
        }
        return [...prev, { product, variantSelections, quantity: qty, key }];
      });
    },
    []
  );

  const removeFromCart = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce(
    (sum, i) => sum + (i.product.price ?? 0) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
