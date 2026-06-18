import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle, MessageCircle, Store, Loader2 } from "lucide-react";
import { api, formatPrice, type Order } from "@/lib/api";
import { Button } from "@/components/ui/button";

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits;
  return null;
}

function buildWhatsAppText(order: Order): string {
  const lines: string[] = [
    `Hi! I'd like to confirm my order 🛍️`,
    ``,
    `*Order ID:* ${order.id}`,
    `*Store:* ${order.sellerStoreName ?? ""}`,
    ``,
    `*Items:*`,
  ];

  for (const item of order.items) {
    const variant = item.variantSnapshot ? ` (${item.variantSnapshot})` : "";
    lines.push(
      `• ${item.quantity}× ${item.productNameSnapshot}${variant} — ${formatPrice(item.priceSnapshot * item.quantity)}`
    );
  }

  lines.push(``);
  lines.push(`*Total: ${formatPrice(order.totalAmount)}*`);

  if (order.customerContact) {
    lines.push(``);
    lines.push(`*My details:* ${order.customerContact}`);
  }

  return lines.join("\n");
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api
      .getOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.message ?? "Failed to load order"))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Store className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "We couldn't find this order."}
          </p>
        </div>
      </div>
    );
  }

  const phone = normalizePhone(order.sellerWhatsappNumber);
  const waText = buildWhatsAppText(order);
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold truncate">
            {order.sellerStoreName ?? "Store"}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Order placed!</h1>
          <p className="text-sm text-muted-foreground">
            Order ID:{" "}
            <span className="font-mono font-semibold text-foreground">
              {order.id}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">Order details</h2>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.quantity}× {item.productNameSnapshot}
                  </p>
                  {item.variantSnapshot && (
                    <p className="text-xs text-muted-foreground">
                      {item.variantSnapshot}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold shrink-0">
                  {formatPrice(item.priceSnapshot * item.quantity)}
                </span>
              </div>
            ))}
            <div className="px-4 py-3 flex justify-between bg-muted/30">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {order.customerContact && (
          <div className="bg-white rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Your details</p>
            <p className="text-sm">{order.customerContact}</p>
          </div>
        )}

        <div className="space-y-3">
          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 bg-green-500 hover:bg-green-600 border-green-600 text-white">
                <MessageCircle className="w-4 h-4" />
                Send order on WhatsApp
              </Button>
            </a>
          ) : (
            <div className="text-center text-sm text-muted-foreground bg-muted rounded-xl p-4">
              Contact the seller to confirm your order.
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (order.sellerSubdomain) {
                navigate(`${BASE}/${order.sellerSubdomain}`);
              } else {
                navigate(BASE + "/");
              }
            }}
          >
            Continue shopping
          </Button>
        </div>
      </main>
    </div>
  );
}
