import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from "react";
import type { Product, Category, Seller } from "@/lib/api";

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

function storageKey(slug: string) {
  return `chatcart_cart_${slug}`;
}

function loadCartFromStorage(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotalAmount: number;
  gstAmount: number;
  gstPercentage: number;
  shippingFee: number;
  shippingKg: number;
  shippingLabel: string;
  totalAmount: number;
  totalSavings: number;
  seller: Seller | null;
  setSeller: (seller: Seller | null) => void;
  getItemPricing: (key: string) => CartItemPricing;
  setCategories: (cats: Category[]) => void;
  initForSeller: (slug: string, seller?: Seller | null) => void;
  addToCart: (product: Product, variants: Record<string, string>, qty?: number) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, qty: number) => void;
  replaceCartItemProduct: (key: string, product: Product, newQty?: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const currentSlugRef = useRef<string | null>(null);

  const initForSeller = useCallback((slug: string, currentSeller?: Seller | null) => {
    if (currentSeller !== undefined && currentSeller !== null) {
      setSeller(currentSeller);
    }
    if (currentSlugRef.current === slug) return;
    if (currentSlugRef.current !== null) {
      setItems((prev) => {
        try {
          localStorage.setItem(storageKey(currentSlugRef.current!), JSON.stringify(prev));
        } catch {}
        return prev;
      });
    }
    currentSlugRef.current = slug;
    setItems(loadCartFromStorage(slug));
  }, []);

  useEffect(() => {
    if (currentSlugRef.current === null) return;
    try {
      localStorage.setItem(storageKey(currentSlugRef.current), JSON.stringify(items));
    } catch {}
  }, [items]);

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

  const replaceCartItemProduct = useCallback((key: string, product: Product, newQty?: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, product, quantity: newQty !== undefined ? newQty : i.quantity }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (currentSlugRef.current) {
      try {
        localStorage.removeItem(storageKey(currentSlugRef.current));
      } catch {}
    }
  }, []);

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

  const subtotalAmount = useMemo(
    () => Array.from(pricingMap.values()).reduce((sum, p) => sum + p.lineTotal, 0),
    [pricingMap]
  );

  const gstPercentage = useMemo(() => {
    if (!seller?.gstPercentage) return 0;
    const parsed = parseFloat(String(seller.gstPercentage));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [seller?.gstPercentage]);

  const gstAmount = useMemo(() => {
    if (gstPercentage <= 0 || subtotalAmount <= 0) return 0;
    return Number(((subtotalAmount * gstPercentage) / 100).toFixed(2));
  }, [subtotalAmount, gstPercentage]);

  const { shippingFee, shippingKg, shippingLabel } = useMemo(() => {
    if (!seller?.enableShipping || subtotalAmount <= 0) {
      return { shippingFee: 0, shippingKg: 0, shippingLabel: "" };
    }
    const ratePerKg = seller.shippingRatePerKg ? parseFloat(String(seller.shippingRatePerKg)) : 0;
    if (ratePerKg <= 0) {
      return { shippingFee: 0, shippingKg: 0, shippingLabel: "" };
    }
    const step = seller.shippingAmountPerKgStep ? parseFloat(String(seller.shippingAmountPerKgStep)) : 0;
    const kg = step > 0 ? Math.max(1, Math.ceil(subtotalAmount / step)) : 1;
    const fee = Math.round(kg * ratePerKg * 100) / 100;
    return {
      shippingFee: fee,
      shippingKg: kg,
      shippingLabel: `${kg} kg shipping`,
    };
  }, [seller, subtotalAmount]);

  const totalAmount = useMemo(() => {
    if (subtotalAmount <= 0) return 0;
    return Number((subtotalAmount + gstAmount + shippingFee).toFixed(2));
  }, [subtotalAmount, gstAmount, shippingFee]);

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
        subtotalAmount,
        gstAmount,
        gstPercentage,
        shippingFee,
        shippingKg,
        shippingLabel,
        totalAmount,
        totalSavings,
        seller,
        setSeller,
        getItemPricing,
        setCategories: handleSetCategories,
        initForSeller,
        addToCart,
        removeFromCart,
        updateQuantity,
        replaceCartItemProduct,
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
