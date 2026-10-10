import { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, Tag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import { api, imgSrc, type Seller, type Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CheckoutPage from "@/pages/CheckoutPage";

import { useMemo } from "react";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  seller: Seller;
  activeProducts?: Product[];
}

export default function CartSheet({ open, onClose, seller, activeProducts }: CartSheetProps) {
  const {
    items,
    totalItems,
    subtotalAmount,
    gstPercentage,
    gstAmount,
    shippingFee,
    shippingLabel,
    totalAmount,
    totalSavings,
    removeFromCart,
    updateQuantity,
    getItemPricing,
    setSeller: setCartSeller,
  } = useCart();
  const { formatPrice, isBaseInr } = useCurrency();
  const [checkout, setCheckout] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (activeProducts && activeProducts.length > 0) return;
    if (seller?.subdomain) {
      api.getProducts(seller.subdomain).then(setFetchedProducts).catch(() => {});
    }
  }, [activeProducts, seller?.subdomain]);

  const effectiveActiveProducts = activeProducts ?? fetchedProducts;

  const activeProductMap = useMemo(() => {
    if (!effectiveActiveProducts || effectiveActiveProducts.length === 0) return null;
    return new Map(effectiveActiveProducts.map((p) => [p.id, p]));
  }, [effectiveActiveProducts]);

  const removeUnavailableItems = () => {
    if (!activeProductMap) return;
    items.forEach((item) => {
      const p = activeProductMap.get(item.product.id);
      if (!p || p.status === "out_of_stock" || p.status === "hidden") {
        removeFromCart(item.key);
      }
    });
  };

  const hasUnavailableItems = useMemo(() => {
    if (!activeProductMap) return false;
    return items.some((item) => {
      const p = activeProductMap.get(item.product.id);
      return !p || p.status === "out_of_stock" || p.status === "hidden";
    });
  }, [items, activeProductMap]);

  useEffect(() => {
    if (seller) {
      setCartSeller(seller);
    }
  }, [seller, setCartSeller]);

  const handleClose = () => {
    setCheckout(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="p-0 flex flex-col w-full sm:max-w-md">
        {checkout ? (
          <CheckoutPage
            seller={seller}
            onBack={() => setCheckout(false)}
          />
        ) : (
          <>
            <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                  {totalItems > 0 && (
                    <span className="text-xs bg-primary text-white rounded-full px-2 py-0.5 font-medium">
                      {totalItems}
                    </span>
                  )}
                </SheetTitle>
                <CurrencySelector />
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 space-y-3">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item) => {
                    const pricing = getItemPricing(item.key);
                    const activeProduct = activeProductMap ? activeProductMap.get(item.product.id) : undefined;
                    const isUnavailable = Boolean(activeProductMap && (!activeProduct || activeProduct.status === "out_of_stock" || activeProduct.status === "hidden"));
                    return (
                      <div key={item.key} className={`flex gap-3 p-4 ${isUnavailable ? "bg-red-50/40" : ""}`}>
                        {item.product.images[0] && (
                          <img
                            src={imgSrc(item.product.images[0].url)}
                            alt={item.product.name}
                            className={`w-14 h-14 rounded-lg object-cover shrink-0 ${isUnavailable ? "opacity-50 grayscale" : ""}`}
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className={`text-sm font-medium leading-snug ${isUnavailable ? "line-through text-muted-foreground" : ""}`}>
                                {item.product.name}
                              </p>
                              {isUnavailable && (
                                <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                                  Sold Out
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.key)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {isUnavailable && (
                            <p className="text-[11px] text-red-600 font-medium">
                              This item is out of stock and cannot be ordered.
                            </p>
                          )}
                          {Object.keys(item.variantSelections).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {Object.entries(item.variantSelections)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </p>
                          )}
                          {!isUnavailable && pricing.hasDiscount && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">
                                {pricing.discountPct}% off ({pricing.bulkMinQty ?? 12}+ qty)
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 bg-muted rounded-lg p-0.5">
                              <button
                                onClick={() =>
                                  updateQuantity(item.key, item.quantity - 1)
                                }
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-card transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.key, item.quantity + 1)
                                }
                                disabled={isUnavailable}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-card transition-colors disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              {isUnavailable ? (
                                <div>
                                  <span className="text-xs line-through text-muted-foreground block">
                                    {formatPrice((item.product.price ?? 0) * item.quantity)}
                                  </span>
                                  <span className="text-xs font-bold text-red-600 block">
                                    Unavailable
                                  </span>
                                </div>
                              ) : pricing.hasDiscount ? (
                                <div>
                                  <span className="text-xs line-through text-muted-foreground mr-1">
                                    {formatPrice((item.product.price ?? 0) * item.quantity)}
                                  </span>
                                  <span className="text-sm font-semibold text-green-600">
                                    {formatPrice(pricing.lineTotal)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold">
                                  {item.product.price != null
                                    ? formatPrice(pricing.lineTotal)
                                    : "—"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-border space-y-3 shrink-0">
                {hasUnavailableItems && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded-lg flex items-center justify-between">
                    <span>Some items in cart are out of stock.</span>
                    <button
                      type="button"
                      onClick={removeUnavailableItems}
                      className="font-bold underline text-red-900 cursor-pointer"
                    >
                      Remove them
                    </button>
                  </div>
                )}
                {totalSavings > 0 && (
                  <div className="flex justify-between text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Dozen discount savings
                    </span>
                    <span className="font-semibold">−{formatPrice(totalSavings)}</span>
                  </div>
                )}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Subtotal</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(subtotalAmount)}
                    </span>
                  </div>
                  {gstPercentage > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                      <span className="font-medium text-foreground">
                        {formatPrice(gstAmount)}
                      </span>
                    </div>
                  )}
                  {shippingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Shipping {shippingLabel ? `(${shippingLabel})` : ""}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatPrice(shippingFee)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-bold pt-1 border-t border-border/60">
                    <span>Total</span>
                    <div className="text-right">
                      <span className="text-primary block">
                        {formatPrice(totalAmount)}
                      </span>
                      {!isBaseInr && (
                        <span className="text-[11px] text-muted-foreground font-normal block">
                          ~ ₹{totalAmount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {hasUnavailableItems ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={removeUnavailableItems}
                  >
                    Remove Sold Out Items to Checkout
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setCheckout(true)}
                  >
                    Proceed to checkout
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
