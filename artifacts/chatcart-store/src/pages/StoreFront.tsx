import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ShoppingCart, Store, Search, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, imgSrc, formatPrice, type Seller, type Product, type Category } from "@/lib/api";
import { Input } from "@/components/ui/input";
import CartSheet from "@/components/CartSheet";

export default function StoreFront() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [, navigate] = useLocation();
  const { totalItems, setCategories } = useCart();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!subdomain) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getSeller(subdomain),
      api.getProducts(subdomain),
      api.getCategories(subdomain).catch(() => [] as Category[]),
    ])
      .then(([sellerData, productsData, categoriesData]) => {
        setSeller(sellerData);
        setProducts(productsData);
        setCategoriesState(categoriesData);
        setCategories(categoriesData);
      })
      .catch((err) => setError(err.message ?? "Failed to load store"))
      .finally(() => setLoading(false));
  }, [subdomain, setCategories]);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isSearching = search.trim().length > 0;

  const usedCategoryIds = new Set(
    products.filter((p) => p.categoryId !== null).map((p) => p.categoryId)
  );
  const visibleCategories = categories.filter((c) => usedCategoryIds.has(c.id));
  const showTabs = visibleCategories.length > 0;

  const filtered = isSearching
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : selectedCategoryId === null
    ? products
    : products.filter((p) => p.categoryId === selectedCategoryId);

  const goToProduct = (id: number) => navigate(`/${subdomain}/p/${id}`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading store…</p>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Store className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <h1 className="text-xl font-semibold text-foreground">Store not found</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "This store doesn't exist or has been removed."}
          </p>
        </div>
      </div>
    );
  }

  const hasBanner = !!(seller.bannerImageUrl || seller.tagline);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {seller.bannerImageUrl ? (
              <img
                src={imgSrc(seller.bannerImageUrl)}
                alt={seller.storeName ?? ""}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-base truncate text-foreground">
              {seller.storeName ?? subdomain}
            </span>
          </div>
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

      {/* ── Brand banner ── */}
      {hasBanner && (
        <div className="bg-card border-b border-border/30">
          <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
            {seller.bannerImageUrl && (
              <img
                src={imgSrc(seller.bannerImageUrl)}
                alt={seller.storeName ?? ""}
                className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-xl text-foreground leading-tight">
                {seller.storeName}
              </h1>
              {seller.tagline && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                  {seller.tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 bg-card border-border/60 focus-visible:ring-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Category tabs ── */}
        {showTabs && !isSearching && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedCategoryId === null
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              All Items
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategoryId === cat.id
                    ? "bg-primary text-white border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.name}
                {cat.dozenDiscountPercent != null && cat.dozenDiscountPercent > 0 && (
                  <span className="ml-1.5 text-xs opacity-80">
                    {cat.dozenDiscountPercent}% off 12+
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Products ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            {isSearching ? (
              <p className="text-muted-foreground">No products found for "{search}"</p>
            ) : (
              <>
                <Store className="w-10 h-10 text-muted-foreground mx-auto opacity-20" />
                <p className="text-muted-foreground">No products available yet</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => goToProduct(p.id)} />
            ))}
          </div>
        )}
      </main>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} seller={seller} />
    </div>
  );
}

function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const primaryImage = product.images[0];
  const [imageError, setImageError] = useState(false);
  const { items, addToCart, updateQuantity } = useCart();
  const isOutOfStock = product.status === "out_of_stock";
  const hasPrice = product.price != null;

  const cartKey = `${product.id}__`;
  const qty = items.find((i) => i.key === cartKey)?.quantity ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, {});
  };
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(cartKey, qty + 1);
  };
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(cartKey, qty - 1);
  };

  const showQtyControls = hasPrice && !isOutOfStock;

  return (
    <div className="group bg-card border border-card-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200 w-full">
      <button onClick={onClick} className="w-full text-left">
        <div className="aspect-square bg-muted overflow-hidden relative">
          {primaryImage && !imageError ? (
            <img
              src={imgSrc(primaryImage.url)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center py-1">
              <span className="text-xs text-muted-foreground font-medium">Out of stock</span>
            </div>
          )}
        </div>
        <div className="px-2.5 pt-2.5 pb-1 space-y-0.5">
          <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
            {product.name}
          </p>
          {hasPrice ? (
            <span className="text-sm font-semibold text-primary">
              {formatPrice(product.price!)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">Price on request</span>
          )}
        </div>
      </button>

      {showQtyControls && (
        <div className="px-2.5 pb-2.5 pt-1">
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              + Add
            </button>
          ) : (
            <div className="flex items-center justify-between bg-primary/8 rounded-lg px-1 py-0.5">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 flex items-center justify-center rounded-md text-primary hover:bg-primary/15 active:bg-primary/20 transition-colors text-lg font-bold leading-none"
              >
                −
              </button>
              <span className="text-sm font-bold text-primary min-w-[1.5rem] text-center">{qty}</span>
              <button
                onClick={handleIncrement}
                className="w-8 h-8 flex items-center justify-center rounded-md text-primary hover:bg-primary/15 active:bg-primary/20 transition-colors text-lg font-bold leading-none"
              >
                +
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
