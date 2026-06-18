import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ShoppingCart, Plus, Minus, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, imgSrc, formatPrice, type Seller, type Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CartSheet from "@/components/CartSheet";

export default function ProductPage() {
  const { subdomain, productId } = useParams<{
    subdomain: string;
    productId: string;
  }>();
  const [, navigate] = useLocation();
  const { addToCart, totalItems } = useCart();
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [seller, setSeller] = useState<Seller | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [variantSelections, setVariantSelections] = useState<
    Record<string, string>
  >({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!subdomain || !productId) return;
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
  }, [subdomain, productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, variantSelections, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
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
          <Store className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Product not found</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "This product doesn't exist."}
          </p>
          <Button variant="outline" onClick={() => navigate(`${BASE}/${subdomain}`)}>
            Back to store
          </Button>
        </div>
      </div>
    );
  }

  const outOfStock = product.status === "out_of_stock";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(`${BASE}/${subdomain}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{seller.storeName ?? subdomain}</span>
            <span className="sm:hidden">Back</span>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="relative gap-2 shrink-0"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {product.images.length > 0 && (
          <div className="space-y-2">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={imgSrc(product.images[activeImage].url)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
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
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={imgSrc(img.url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{product.name}</h1>
            {outOfStock && (
              <Badge variant="secondary" className="shrink-0 mt-0.5">
                Out of stock
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-primary">
            {formatPrice(product.price)}
          </p>
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {product.description}
          </p>
        )}

        {product.variants.map((variant) => (
          <div key={variant.id} className="space-y-2">
            <p className="text-sm font-semibold">{variant.label}</p>
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
                      : "bg-white text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white transition-colors"
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
      </main>

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        seller={seller}
      />
    </div>
  );
}
