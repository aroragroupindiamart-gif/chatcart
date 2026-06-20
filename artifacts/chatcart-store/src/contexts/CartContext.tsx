import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import type { Product, Category } from "@/lib/api";

export interface CartItem {
  product: Product;
  variantSelections: Record<string, string>;
  quantity: number;
  key: string;
}

export interface CartItemPricing {
  effectiveUnitPrice: number;
  lineTotal: number;
  savings: number;
  hasDiscount: boolean;
  discountPct: number;
  bulkMinQty: number | null;
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
  totalSavings: number;
  getItemPricing: (key: string) => CartItemPricing;
  setCategories: (cats: Category[]) => void;
  addToCart: (product: Product, variants: Record<string, string>, qty?: number) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const handleSetCategories = useCallback((cats: Category[]) => {
    setCategories(cats);
  }, []);

  const pricingMap = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const map = new Map<string, CartItemPricing>();
    for (const item of items) {
      const price = item.product.price ?? 0;
      let effectiveUnitPrice = price;
      let discountPct = 0;
      if (item.product.categoryId != null && price > 0) {
        const cat = catMap.get(item.product.categoryId);
        const minQty = cat?.bulkDiscountMinQty ?? null;
        const pct =
          cat?.dozenDiscountPercent != null
            ? parseFloat(String(cat.dozenDiscountPercent))
            : 0;
        if (minQty != null && pct > 0 && item.quantity >= minQty) {
          discountPct = pct;
          effectiveUnitPrice = price * (1 - pct / 100);
        }
      }
      const lineTotal = effectiveUnitPrice * item.quantity;
      const originalLineTotal = price * item.quantity;
      const cat = item.product.categoryId != null ? catMap.get(item.product.categoryId) : undefined;
      map.set(item.key, {
        effectiveUnitPrice,
        lineTotal,
        savings: originalLineTotal - lineTotal,
        hasDiscount: discountPct > 0,
        discountPct,
        bulkMinQty: cat?.bulkDiscountMinQty ?? null,
      });
    }
    return map;
  }, [items, categories]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const totalAmount = useMemo(
    () => Array.from(pricingMap.values()).reduce((sum, p) => sum + p.lineTotal, 0),
    [pricingMap]
  );

  const totalSavings = useMemo(
    () => Array.from(pricingMap.values()).reduce((sum, p) => sum + p.savings, 0),
    [pricingMap]
  );

  const getItemPricing = useCallback(
    (key: string): CartItemPricing =>
      pricingMap.get(key) ?? {
        effectiveUnitPrice: 0,
        lineTotal: 0,
        savings: 0,
        hasDiscount: false,
        discountPct: 0,
        bulkMinQty: null,
      },
    [pricingMap]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalAmount,
        totalSavings,
        getItemPricing,
        setCategories: handleSetCategories,
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
