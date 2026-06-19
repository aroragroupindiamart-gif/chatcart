import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, formatPrice, imgSrc, type Seller } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutPageProps {
  seller: Seller;
  onBack: () => void;
}

export default function CheckoutPage({ seller, onBack }: CheckoutPageProps) {
  const [, navigate] = useLocation();
  const { items, totalAmount, clearCart } = useCart();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createOrder({
        sellerId: seller.id,
        customerContact: `Name: ${name.trim()}, Phone: ${phone.trim()}`,
        items: items.map((item) => ({
          productNameSnapshot: item.product.name,
          priceSnapshot: (item.product.price ?? 0).toFixed(2),
          variantSnapshot:
            Object.keys(item.variantSelections).length > 0
              ? Object.entries(item.variantSelections)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
              : undefined,
          quantity: item.quantity,
        })),
      });
      clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to place order. Try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold">Checkout</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Order summary
          </h3>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {items.map((item) => (
              <div key={item.key} className="flex gap-3 p-3">
                {item.product.images[0] && (
                  <img
                    src={imgSrc(item.product.images[0].url)}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.product.name}
                  </p>
                  {Object.keys(item.variantSelections).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(item.variantSelections)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.product.price != null
                      ? `${formatPrice(item.product.price)} × ${item.quantity}`
                      : `Qty: ${item.quantity}`}
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  {item.product.price != null
                    ? formatPrice(item.product.price * item.quantity)
                    : "—"}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center p-3 bg-muted/50">
              <span className="font-semibold text-sm">Total</span>
              <span className="font-bold text-primary">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" id="checkout-form">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Your details
          </h3>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <Button
          type="submit"
          form="checkout-form"
          className="w-full gap-2"
          disabled={submitting || !name.trim() || !phone.trim()}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Placing order…" : `Place order · ${formatPrice(totalAmount)}`}
        </Button>
      </div>
    </div>
  );
}
