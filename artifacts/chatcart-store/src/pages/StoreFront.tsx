import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ShoppingCart, Store, Search, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, imgSrc, formatPrice, type Seller, type Product, type Category } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CartSheet from "@/components/CartSheet";

export default function StoreFront() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [, navigate] = useLocation();
  const { totalItems } = useCart();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

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
        setCategories(categoriesData);
      })
      .catch((err) => setError(err.message ?? "Failed to load store"))
      .finally(() => setLoading(false));
  }, [subdomain]);

  const usedCategoryIds = new Set(products.filter(p => p.categoryId !== null).map(p => p.categoryId));
  const visibleCategories = categories.filter(c => usedCategoryIds.has(c.id));

  const filtered = products.filter((p) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedCategory === null || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
          <Store className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Store not found</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "This store doesn't exist or has been removed."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base truncate">
              {seller.storeName ?? subdomain}
            </span>
          </div>
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

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {visibleCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                selectedCategory === null
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:bg-muted"
              }`}
            >
              All
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                }
                className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                  selectedCategory === cat.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() =>
                  navigate(`${BASE}/${subdomain}/p/${product.id}`)
                }
              />
            ))}
          </div>
        )}
      </main>

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        seller={seller}
      />
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

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {primaryImage ? (
          <img
            src={imgSrc(primaryImage.url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Store className="w-10 h-10 opacity-30" />
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-semibold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.status === "out_of_stock" && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Out of stock
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
