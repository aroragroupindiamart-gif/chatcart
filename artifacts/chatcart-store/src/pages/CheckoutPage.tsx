import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Tag, AlertTriangle, TrendingUp, Package } from "lucide-react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { api, formatPrice, imgSrc, type Seller, type Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface CheckoutPageProps {
  seller: Seller;
  onBack: () => void;
}

interface OrderLineItem {
  productNameSnapshot: string;
  priceSnapshot: string;
  variantSnapshot?: string;
  productImageSnapshot?: string;
  quantity: number;
}

interface ValidationIssue {
  productName: string;
  reason: "unavailable" | "out_of_stock" | "qty_reduced" | "price_changed";
  detail?: string;
}

interface ValidationResult {
  issues: ValidationIssue[];
  resolvedItems: OrderLineItem[];
}

async function validateCart(
  subdomain: string,
  cartItems: CartItem[]
): Promise<ValidationResult> {
  const freshProducts: Product[] = await api.getProducts(subdomain);
  const freshMap = new Map(freshProducts.map((p) => [p.id, p]));

  const issues: ValidationIssue[] = [];
  const resolvedItems: OrderLineItem[] = [];

  for (const item of cartItems) {
    const fresh = freshMap.get(item.product.id);
    const variantSnapshot =
      Object.keys(item.variantSelections).length > 0
        ? Object.entries(item.variantSelections)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : undefined;
    const imageSnapshot = item.product.images[0]?.url ?? undefined;

    if (!fresh) {
      issues.push({ productName: item.product.name, reason: "unavailable" });
      continue;
    }

    if (fresh.status === "out_of_stock") {
      issues.push({ productName: item.product.name, reason: "out_of_stock" });
      continue;
    }

    let adjustedQty = item.quantity;
    if (fresh.stockCount !== null && fresh.stockCount > 0 && fresh.stockCount < item.quantity) {
      issues.push({
        productName: item.product.name,
        reason: "qty_reduced",
        detail: `Only ${fresh.stockCount} available — quantity reduced from ${item.quantity} to ${fresh.stockCount}`,
      });
      adjustedQty = fresh.stockCount;
    }

    const oldPrice = item.product.price;
    const newPrice = fresh.price;
    if (oldPrice !== null && newPrice !== null && Math.abs(oldPrice - newPrice) > 0.009) {
      issues.push({
        productName: item.product.name,
        reason: "price_changed",
        detail: `Price changed from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}`,
      });
    }

    const effectivePrice = newPrice ?? oldPrice ?? 0;
    resolvedItems.push({
      productNameSnapshot: item.product.name,
      priceSnapshot: effectivePrice.toFixed(2),
      variantSnapshot,
      productImageSnapshot: imageSnapshot,
      quantity: adjustedQty,
    });
  }

  return { issues, resolvedItems };
}

export default function CheckoutPage({ seller, onBack }: CheckoutPageProps) {
  const [, navigate] = useLocation();
  const { items, totalAmount, totalSavings, clearCart, getItemPricing } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const placeOrder = async (orderItems: OrderLineItem[]) => {
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createOrder({
        sellerId: seller.id,
        customerContact: `Name: ${name.trim()}, Phone: ${phone.trim()}`,
        items: orderItems,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const subdomain = seller.subdomain;
      if (!subdomain) throw new Error("Store not found");
      const result = await validateCart(subdomain, items);
      if (result.issues.length > 0) {
        setValidation(result);
        setSubmitting(false);
        return;
      }
      await placeOrder(result.resolvedItems);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to validate cart. Try again."
      );
      setSubmitting(false);
    }
  };

  const adjustedTotal = validation?.resolvedItems.reduce(
    (sum, item) => sum + parseFloat(item.priceSnapshot) * (item.quantity ?? 1),
    0
  ) ?? 0;

  const issueIcon = (reason: ValidationIssue["reason"]) => {
    if (reason === "price_changed") return <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />;
    if (reason === "qty_reduced") return <Package className="w-4 h-4 text-amber-500 shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />;
  };

  const issueLabel = (reason: ValidationIssue["reason"]) => {
    if (reason === "unavailable") return "No longer available";
    if (reason === "out_of_stock") return "Out of stock";
    if (reason === "qty_reduced") return "Quantity reduced";
    return "Price changed";
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
            {items.map((item) => {
              const pricing = getItemPricing(item.key);
              return (
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
                    {pricing.hasDiscount ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {pricing.discountPct}% off · {formatPrice(pricing.effectiveUnitPrice)} × {item.quantity}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {item.product.price != null
                          ? `${formatPrice(item.product.price)} × ${item.quantity}`
                          : `Qty: ${item.quantity}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {pricing.hasDiscount ? (
                      <div>
                        <p className="text-xs line-through text-muted-foreground">
                          {formatPrice((item.product.price ?? 0) * item.quantity)}
                        </p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatPrice(pricing.lineTotal)}
                        </p>
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
              );
            })}
            {totalSavings > 0 && (
              <div className="flex justify-between items-center p-3 bg-green-50">
                <span className="text-xs text-green-700 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Dozen discount savings
                </span>
                <span className="text-xs font-semibold text-green-700">
                  −{formatPrice(totalSavings)}
                </span>
              </div>
            )}
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
          {submitting ? "Checking items…" : `Place order · ${formatPrice(totalAmount)}`}
        </Button>
      </div>

      {/* ── Revalidation dialog ── */}
      <AlertDialog open={!!validation} onOpenChange={(open) => { if (!open) setValidation(null); }}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Your cart needs updating
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-sm text-muted-foreground">
                  Some items in your cart have changed since you added them:
                </p>
                <ul className="space-y-2">
                  {validation?.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {issueIcon(issue.reason)}
                      <span>
                        <span className="font-medium text-foreground">{issue.productName}</span>
                        {" — "}
                        <span className="text-muted-foreground">
                          {issue.detail ?? issueLabel(issue.reason)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {validation && validation.resolvedItems.length === 0 && (
                  <p className="text-sm text-destructive font-medium">
                    All items have been removed. Your cart is now empty.
                  </p>
                )}
                {validation && validation.resolvedItems.length > 0 && adjustedTotal > 0 && (
                  <p className="text-sm font-semibold text-foreground pt-1 border-t border-border">
                    Updated total: {formatPrice(adjustedTotal)}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setValidation(null)}>
              Go back to cart
            </AlertDialogCancel>
            {validation && validation.resolvedItems.length > 0 ? (
              <AlertDialogAction
                onClick={() => {
                  const resolved = validation.resolvedItems;
                  setValidation(null);
                  placeOrder(resolved);
                }}
              >
                Update &amp; place order
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => setValidation(null)}>
                Got it
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
