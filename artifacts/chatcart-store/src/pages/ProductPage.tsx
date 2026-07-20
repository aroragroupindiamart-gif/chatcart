import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ShoppingCart, Plus, Minus, Store, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, imgSrc, formatPrice, type Seller, type Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CartSheet from "@/components/CartSheet";
import { StoreUnavailable } from "@/components/StoreUnavailable";

function normalizeWhatsApp(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

export default function ProductPage() {
  const { subdomain, productId } = useParams<{
    subdomain: string;
    productId: string;
  }>();
  const [, navigate] = useLocation();
  const { addToCart, totalItems, initForSeller } = useCart();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [seller, setSeller] = useState<Seller | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!subdomain || !productId) return;
    initForSeller(subdomain);
    setLoading(true);
    setError(null);
    Promise.all([
      api.getSeller(subdomain),
      api.getProduct(subdomain, parseInt(productId)),
    ])
      .then(([s, p]) => {
        setSeller(s);
        setProduct(p);
        const defaults: Record<string, string> = {};
        for (const v of p.variants) {
          if (v.options.length > 0) defaults[v.label] = v.options[0];
        }
        setVariantSelections(defaults);
      })
      .catch((err) => setError(err.message ?? "Failed to load product"))
      .finally(() => setLoading(false));
  }, [subdomain, productId, initForSeller]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, variantSelections, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleMessageSeller = () => {
    if (!seller) return;
    const phone = normalizeWhatsApp(seller.whatsappNumber);
    if (!phone) return;
    const text = encodeURIComponent(
      `Hi! I'm interested in "${product?.name}". What's the price?`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product || !seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Store className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <h1 className="text-xl font-semibold text-foreground">Product not found</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "This product doesn't exist."}
          </p>
          <Button variant="outline" onClick={() => navigate(`/${subdomain}`)}>
            Back to store
          </Button>
        </div>
      </div>
    );
  }

  if (seller.plan === "pending") {
    return <StoreUnavailable storeName={seller.storeName ?? subdomain} />;
  }

  const outOfStock = product.status === "out_of_stock";
  const hasPrice = product.price != null;
  const sellerPhone = normalizeWhatsApp(seller.whatsappNumber);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <a
            href={`${BASE}/${subdomain}`}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-muted-foreground" />
            {seller.bannerImageUrl ? (
              <img
                src={imgSrc(seller.bannerImageUrl)}
                alt={seller.storeName ?? ""}
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-border/40"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Store className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="text-sm font-medium truncate text-foreground">
              {seller.storeName ?? subdomain}
            </span>
          </a>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Images */}
        {product.images.length > 0 && (
          <div className="space-y-2">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              {brokenImages.has(activeImage) ? (
                <Store className="w-12 h-12 text-muted-foreground opacity-20" />
              ) : (
                <img
                  src={imgSrc(product.images[activeImage].url)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setBrokenImages(prev => new Set(prev).add(activeImage))}
                />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(idx)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === activeImage
                        ? "border-primary"
                        : "border-border/40 hover:border-border"
                    }`}
                  >
                    {brokenImages.has(idx) ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Store className="w-4 h-4 text-muted-foreground opacity-20" />
                      </div>
                    ) : (
                      <img
                        src={imgSrc(img.url)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setBrokenImages(prev => new Set(prev).add(idx))}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Name + Price */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug text-foreground">{product.name}</h1>
            {outOfStock && (
              <Badge variant="secondary" className="shrink-0 mt-0.5">
                Out of stock
              </Badge>
            )}
          </div>
          {hasPrice ? (
            <p className="text-2xl font-bold text-primary">
              {formatPrice(product.price!)}
            </p>
          ) : (
            <p className="text-base text-muted-foreground italic">Price on request</p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Variants */}
        {product.variants.map((variant) => (
          <div key={variant.id} className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{variant.label}</p>
            <div className="flex flex-wrap gap-2">
              {variant.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() =>
                    setVariantSelections((prev) => ({
                      ...prev,
                      [variant.label]: opt,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    variantSelections[variant.label] === opt
                      ? "bg-primary text-white border-primary"
                      : "bg-muted text-foreground border-border/60 hover:border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Action row */}
        {hasPrice ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-card transition-colors text-foreground"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-foreground">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-card transition-colors text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              className="flex-1 gap-2"
              onClick={handleAddToCart}
              disabled={outOfStock}
            >
              <ShoppingCart className="w-4 h-4" />
              {added ? "Added!" : outOfStock ? "Out of stock" : "Add to cart"}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full gap-2"
            onClick={handleMessageSeller}
            disabled={!sellerPhone}
          >
            <MessageCircle className="w-4 h-4" />
            Message seller for price
          </Button>
        )}
      </main>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} seller={seller} />
    </div>
  );
}
