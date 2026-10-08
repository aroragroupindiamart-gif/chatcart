import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle, MessageCircle, Store, Loader2, X, AlertTriangle } from "lucide-react";
import { api, formatPrice as formatInr, imgSrc, type Order } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import { buildWhatsAppText, getWhatsAppUrl, formatWhatsAppPhone } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { usePageMeta, absImgUrl } from "@/lib/usePageMeta";

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function TappableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [lightbox, setLightbox] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className ?? ""} cursor-pointer active:opacity-75 transition-opacity`}
        onClick={() => setLightbox(true)}
      />
      {lightbox && <ImageLightbox src={src} alt={alt} onClose={() => setLightbox(false)} />}
    </>
  );
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { currency, rates, formatPrice, isBaseInr } = useCurrency();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const cachedCurrencyInfo = (() => {
    try {
      const raw = sessionStorage.getItem(`chatcart_order_currency_${orderId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const activeCurrencyPayload = cachedCurrencyInfo || (!isBaseInr && rates[currency.code] ? {
    code: currency.code,
    symbol: currency.symbol,
    rate: rates[currency.code],
  } : undefined);

  const [order, setOrder] = useState<Order | null>(() => {
    if (!orderId) return null;
    try {
      const cached = sessionStorage.getItem(`chatcart_order_${orderId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!orderId) return true;
    try {
      return !sessionStorage.getItem(`chatcart_order_${orderId}`);
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;
    api
      .getOrder(orderId)
      .then((data) => {
        setOrder(data);
        try {
          sessionStorage.setItem(`chatcart_order_${orderId}`, JSON.stringify(data));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        if (!order) {
          setError(err.message ?? "Failed to load order");
        }
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!order || autoTriggered.current) return;
    const flagKey = `chatcart_fresh_order_${order.id}`;
    const freshStatus = sessionStorage.getItem(flagKey);
    // If flag is "1" (meaning auto-redirect was not completed in checkout), attempt once as fallback
    if (freshStatus !== "1") return;
    sessionStorage.removeItem(flagKey);
    const phone = formatWhatsAppPhone(order.sellerWhatsappNumber);
    if (!phone) return;
    autoTriggered.current = true;
    const orderUrl = `${window.location.origin}${BASE}/orders/${order.id}`;
    const waText = buildWhatsAppText(order, orderUrl, activeCurrencyPayload);
    const url = getWhatsAppUrl(phone, waText);
    if (url) {
      try {
        window.location.href = url;
      } catch {
        // silently ignored — manual buttons remain the fallback
      }
    }
  }, [order, BASE, activeCurrencyPayload]);

  usePageMeta(
    order
      ? {
          title: "Chatcart Order Confirmation",
          description: "Tap to view your order details and photos.",
          ogImage: "https://chatcart.in/store/opengraph.jpg",
          ogUrl: `${window.location.origin}${BASE}/orders/${order.id}`,
        }
      : null
  );

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

  const orderUrl = `${window.location.origin}${BASE}/orders/${order.id}`;
  const waText = buildWhatsAppText(order, orderUrl, activeCurrencyPayload);
  const waUrl = getWhatsAppUrl(order.sellerWhatsappNumber, waText);

  const payableTotal = order.payableTotalAmount ?? order.totalAmount;
  const inStockItems = order.items.filter((i) => !i.isSoldOut);
  const inStockItemsCount = inStockItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {order.sellerSubdomain ? (
            <a
              href={`${BASE}/${order.sellerSubdomain}`}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              {order.sellerBannerImageUrl ? (
                <img
                  src={imgSrc(order.sellerBannerImageUrl)}
                  alt={order.sellerStoreName ?? "Store"}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-semibold truncate">
                {order.sellerStoreName ?? "Store"}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              {order.sellerBannerImageUrl ? (
                <img
                  src={imgSrc(order.sellerBannerImageUrl)}
                  alt={order.sellerStoreName ?? "Store"}
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-semibold truncate">
                {order.sellerStoreName ?? "Store"}
              </span>
            </div>
          )}
          <CurrencySelector />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-28 sm:pb-12 space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Order details</h1>
          <p className="text-sm text-muted-foreground">
            Order ID:{" "}
            <span className="font-mono font-semibold text-foreground">
              {order.id}
            </span>
          </p>
        </div>

        {waUrl && (
          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-sm text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Final Step: Send on WhatsApp
            </div>
            
            <p className="text-sm text-emerald-950 font-medium leading-relaxed px-1">
              Your order is recorded! If WhatsApp did not open automatically, tap below to send your order directly to the seller:
            </p>

            <a
              href={waUrl}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md transition-all text-sm tracking-wide"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Send Order on WhatsApp
            </a>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Order items</h2>
            {order.hasSoldOutItems && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Contains Sold Out Items
              </span>
            )}
          </div>

          {order.hasSoldOutItems && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Some items are currently Sold Out</p>
                <p className="mt-0.5 text-amber-700 leading-snug">
                  Items marked <strong className="text-red-700">(Sold Out)</strong> are out of stock. Your payable balance below has been updated to reflect only available in-stock items.
                </p>
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div
                key={item.id}
                className={`px-4 py-3 flex gap-3 items-start ${item.isSoldOut ? "bg-red-50/50" : ""}`}
              >
                {item.productImageSnapshot && (
                  <TappableImage
                    src={imgSrc(item.productImageSnapshot)}
                    alt={item.productNameSnapshot}
                    className={`w-12 h-12 rounded-lg object-cover shrink-0 border border-border/40 ${item.isSoldOut ? "opacity-50 grayscale" : ""}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                    <span className={item.isSoldOut ? "line-through text-muted-foreground" : ""}>
                      {item.quantity}× {item.productNameSnapshot}
                    </span>
                    {item.isSoldOut && (
                      <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded text-[11px]">
                        (Sold Out)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPrice(item.priceSnapshot)} each
                  </p>
                  {item.variantSnapshot && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.variantSnapshot}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {item.isSoldOut ? (
                    <div>
                      <span className="text-xs text-red-600 font-semibold line-through block">
                        {formatPrice(item.priceSnapshot * item.quantity)}
                      </span>
                      <span className="text-[10px] text-red-700 font-bold block mt-0.5">
                        ₹0.00
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">
                      {formatPrice(item.priceSnapshot * item.quantity)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {order.hasSoldOutItems ? (
              <div className="px-4 py-3 bg-muted/30 space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Original Total ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})</span>
                  <span className="line-through">{formatPrice(order.totalAmount)}</span>
                </div>
                {order.payableSubtotalAmount != null && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>In-Stock Subtotal</span>
                    <span>{formatPrice(order.payableSubtotalAmount)}</span>
                  </div>
                )}
                {order.payableGstAmount != null && order.payableGstAmount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>GST ({order.gstPercentage}%)</span>
                    <span>{formatPrice(order.payableGstAmount)}</span>
                  </div>
                )}
                {order.payableShippingAmount != null && order.payableShippingAmount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Shipping ({order.payableShippingKg ?? 1} kg shipping)</span>
                    <span>{formatPrice(order.payableShippingAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-1 border-t border-border/60">
                  <span className="font-bold text-foreground">
                    Payable Balance ({inStockItemsCount} in-stock {inStockItemsCount === 1 ? "item" : "items"})
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-primary text-base">
                      {formatPrice(payableTotal)}
                    </span>
                    {!isBaseInr && (
                      <span className="block text-[11px] text-muted-foreground font-normal">
                        (~ {formatInr(payableTotal)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-muted/30 space-y-1.5 text-sm">
                {order.subtotalAmount != null && ((order.gstAmount != null && order.gstAmount > 0) || (order.shippingAmount != null && order.shippingAmount > 0)) ? (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Items Subtotal</span>
                      <span>{formatPrice(order.subtotalAmount)}</span>
                    </div>
                    {order.gstAmount != null && order.gstAmount > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>GST ({order.gstPercentage}%)</span>
                        <span>{formatPrice(order.gstAmount)}</span>
                      </div>
                    )}
                    {order.shippingAmount != null && order.shippingAmount > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Shipping ({order.shippingKg ?? 1} kg shipping)</span>
                        <span>{formatPrice(order.shippingAmount)}</span>
                      </div>
                    )}
                  </>
                ) : null}
                <div className="flex justify-between items-center pt-1 border-t border-border/60">
                  <span className="font-semibold">
                    Total ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-primary text-base">
                      {formatPrice(order.totalAmount)}
                    </span>
                    {!isBaseInr && (
                      <span className="block text-[11px] text-muted-foreground font-normal">
                        (~ {formatInr(order.totalAmount)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {order.customerContact && (
          <div className="bg-card rounded-xl border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Your details</p>
            <p className="text-sm">{order.customerContact}</p>
          </div>
        )}

        <div className="space-y-3">
          {waUrl ? (
            <a href={waUrl}>
              <Button className="w-full gap-2.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold py-6 text-base shadow-sm">
                <MessageCircle className="w-5 h-5 fill-current" />
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
                navigate(`/${order.sellerSubdomain}`);
              } else {
                navigate("/");
              }
            }}
          >
            Continue shopping
          </Button>
        </div>
      </main>

      {waUrl && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-40 sm:hidden shadow-lg">
          <div className="max-w-lg mx-auto">
            <a
              href={waUrl}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md text-sm transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Send Order on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
