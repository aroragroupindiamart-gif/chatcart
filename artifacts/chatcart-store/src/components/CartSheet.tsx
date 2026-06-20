import { useState } from "react";
import { X, Plus, Minus, ShoppingCart, Tag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, imgSrc, type Seller } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CheckoutPage from "@/pages/CheckoutPage";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  seller: Seller;
}

export default function CartSheet({ open, onClose, seller }: CartSheetProps) {
  const { items, totalItems, totalAmount, totalSavings, removeFromCart, updateQuantity, getItemPricing } =
    useCart();
  const [checkout, setCheckout] = useState(false);

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
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart
                {totalItems > 0 && (
                  <span className="text-xs bg-primary text-white rounded-full px-2 py-0.5 font-medium">
                    {totalItems}
                  </span>
                )}
              </SheetTitle>
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
                    return (
                      <div key={item.key} className="flex gap-3 p-4">
                        {item.product.images[0] && (
                          <img
                            src={imgSrc(item.product.images[0].url)}
                            alt={item.product.name}
                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between gap-2">
                            <p className="text-sm font-medium leading-snug">
                              {item.product.name}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.key)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {Object.keys(item.variantSelections).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {Object.entries(item.variantSelections)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </p>
                          )}
                          {pricing.hasDiscount && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">
                                {pricing.discountPct}% off (12+ qty)
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
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-card transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              {pricing.hasDiscount ? (
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
                {totalSavings > 0 && (
                  <div className="flex justify-between text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Dozen discount savings
                    </span>
                    <span className="font-semibold">−{formatPrice(totalSavings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold text-primary">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setCheckout(true)}
                >
                  Proceed to checkout
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
