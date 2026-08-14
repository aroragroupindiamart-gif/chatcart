import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ShoppingCart, Store, Search, X, ArrowUp, LayoutGrid, ZoomIn } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { api, imgSrc, formatPrice, type Seller, type Product, type Category } from "@/lib/api";
import { Input } from "@/components/ui/input";
import CartSheet from "@/components/CartSheet";
import ImageLightboxModal from "@/components/ImageLightboxModal";
import { usePageMeta, absImgUrl } from "@/lib/usePageMeta";
import { StoreUnavailable } from "@/components/StoreUnavailable";

export default function StoreFront() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [, navigate] = useLocation();
  const { totalItems, setCategories, initForSeller } = useCart();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<{ url: string; id?: number }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    return cat ? Number(cat) : null;
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0 && subdomain) {
        sessionStorage.setItem(`storefront_scroll_${subdomain}`, String(window.scrollY));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [subdomain]);

  // Restore scroll position after loading products
  useEffect(() => {
    if (!loading && products.length > 0 && subdomain) {
      const saved = sessionStorage.getItem(`storefront_scroll_${subdomain}`);
      if (saved) {
        const y = Number(saved);
        if (!isNaN(y) && y > 0) {
          setTimeout(() => {
            window.scrollTo(0, y);
          }, 80);
        }
      }
    }
  }, [loading, products, subdomain]);

  // Mobile Back Button Interceptor for Modals (Cart, Categories, Lightbox)
  useEffect(() => {
    const isModalOpen = cartOpen || allCategoriesOpen || lightboxImages.length > 0;
    if (!isModalOpen) return;

    window.history.pushState({ modal: true }, "");

    const handlePopState = () => {
      if (cartOpen) setCartOpen(false);
      if (allCategoriesOpen) setAllCategoriesOpen(false);
      if (lightboxImages.length > 0) setLightboxImages([]);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [cartOpen, allCategoriesOpen, lightboxImages]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const checkTabsScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const handleCategoryChange = (id: number | null) => {
    setSelectedCategoryId(id);
    const url = new URL(window.location.href);
    if (id !== null) {
      url.searchParams.set("category", String(id));
    } else {
      url.searchParams.delete("category");
    }
    window.history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    if (!subdomain) return;
    initForSeller(subdomain);
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
  }, [subdomain, setCategories, initForSeller]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    checkTabsScroll();
    el.addEventListener("scroll", checkTabsScroll, { passive: true });
    const ro = new ResizeObserver(checkTabsScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkTabsScroll);
      ro.disconnect();
    };
  }, [checkTabsScroll]);

  useEffect(() => {
    setTimeout(checkTabsScroll, 50);
  }, [categories, checkTabsScroll]);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  usePageMeta(
    seller
      ? {
          title: seller.storeName ?? "Chatcart Storefront",
          description:
            seller.tagline ?? "Browse our catalog and order on WhatsApp.",
          ogImage:
            absImgUrl(seller.bannerImageUrl, imgSrc) ??
            `${window.location.origin}${BASE}/opengraph.jpg`,
          ogUrl: `${window.location.origin}${BASE}/${subdomain}`,
        }
      : null
  );

  const isSearching = search.trim().length > 0;

  const usedCategoryIds = new Set<number>();
  products.forEach((p) => {
    if (p.categoryIds && p.categoryIds.length > 0) {
      p.categoryIds.forEach((id) => usedCategoryIds.add(id));
    } else if (p.categoryId !== null && p.categoryId !== undefined) {
      usedCategoryIds.add(p.categoryId);
    }
  });
  const visibleCategories = categories.filter((c) => usedCategoryIds.has(c.id));
  const showTabs = visibleCategories.length > 0;

  const categoriesWithCounts = visibleCategories.map((cat) => {
    const productCount = products.filter((p) => {
      if (p.categoryIds && p.categoryIds.length > 0) {
        return p.categoryIds.includes(cat.id);
      }
      return p.categoryId !== null && Number(p.categoryId) === Number(cat.id);
    }).length;
    return { ...cat, productCount };
  });

  const filtered = isSearching
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku?.toLowerCase() ?? "").includes(search.toLowerCase())
      )
    : selectedCategoryId === null
    ? products
    : products.filter((p) => {
        if (p.categoryIds && p.categoryIds.length > 0) {
          return p.categoryIds.includes(Number(selectedCategoryId));
        }
        return p.categoryId !== null && Number(p.categoryId) === Number(selectedCategoryId);
      });

  const goToProduct = (id: number) => {
    if (subdomain) {
      sessionStorage.setItem(`storefront_scroll_${subdomain}`, String(window.scrollY));
    }
    navigate(`/${subdomain}/p/${id}`);
  };

  const handleOpenLightbox = (imgs: { url: string; id?: number }[], index = 0) => {
    setLightboxImages(imgs);
    setLightboxIndex(index);
  };

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

  if (seller.plan === "pending") {
    return <StoreUnavailable storeName={seller.storeName ?? subdomain} />;
  }

  const hasBanner = !!(seller.bannerImageUrl || seller.tagline);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <a
            href={`${BASE}/${subdomain}`}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            {seller.bannerImageUrl ? (
              <img
                src={imgSrc(seller.bannerImageUrl) + "?w=100"}
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
          </a>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center font-bold leading-none shadow-xs">
                {totalItems}
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
                src={imgSrc(seller.bannerImageUrl) + "?w=200"}
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
          <div className="flex items-center gap-2 -mx-4 px-4">
            <div className="relative flex-1 min-w-0">
              {showLeftFade && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background to-transparent" />
              )}
              {showRightFade && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background to-transparent" />
              )}
              <div
                ref={tabsRef}
                className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedCategoryId === cat.id
                        ? "bg-primary text-white border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                    {cat.dozenDiscountPercent != null && cat.dozenDiscountPercent > 0 && cat.bulkDiscountMinQty != null && (
                      <span className="ml-1.5 text-xs opacity-80">
                        {cat.dozenDiscountPercent}% off {cat.bulkDiscountMinQty}+
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedCategoryId === null
                      ? "bg-primary text-white border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  All Items
                </button>
              </div>
            </div>

            <button
              onClick={() => setAllCategoriesOpen(true)}
              className={`shrink-0 p-2 rounded-full border transition-all flex items-center justify-center shadow-sm h-8 w-8 ${
                visibleCategories.length > 6
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
              title="View all categories"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
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
              <ProductCard
                key={p.id}
                product={p}
                layout={seller.productImageLayout ?? "square"}
                onClick={() => goToProduct(p.id)}
                onOpenLightbox={handleOpenLightbox}
              />
            ))}
          </div>
        )}
      </main>

      {(seller.plan !== "pro" && seller.plan !== "lifetime") && (
        <footer className="max-w-3xl mx-auto px-4 py-6 mt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a href="https://chatcart.in" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-foreground/70">
              Chatcart
            </a>
            {seller.storeName ? ` · ${seller.storeName}` : ""}
          </p>
        </footer>
      )}

      {allCategoriesOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          onClick={() => setAllCategoriesOpen(false)}
        >
          <div
            className="bg-background w-full max-w-md rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Categories
              </h3>
              <button
                onClick={() => setAllCategoriesOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {/* All Items at the top */}
              <button
                onClick={() => {
                  handleCategoryChange(null);
                  setAllCategoriesOpen(false);
                }}
                className={`w-full px-4 py-3.5 rounded-2xl border text-left font-semibold text-sm transition-all flex items-center justify-between ${
                  selectedCategoryId === null
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-card border-border/80 text-foreground hover:bg-muted/70 hover:border-primary/30"
                }`}
              >
                <span>All Items</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  selectedCategoryId === null 
                    ? "bg-white/20 text-white" 
                    : "bg-muted text-muted-foreground border border-border/30"
                }`}>
                  {products.length}
                </span>
              </button>

              {/* Real categories */}
              {categoriesWithCounts.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    handleCategoryChange(cat.id);
                    setAllCategoriesOpen(false);
                  }}
                  className={`w-full px-4 py-3.5 rounded-2xl border text-left font-semibold text-sm transition-all flex items-center justify-between ${
                    selectedCategoryId === cat.id
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-card border-border/80 text-foreground hover:bg-muted/70 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{cat.name}</span>
                    {cat.dozenDiscountPercent != null && cat.dozenDiscountPercent > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        selectedCategoryId === cat.id 
                          ? "bg-white/20 text-white" 
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {cat.dozenDiscountPercent}% off
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    selectedCategoryId === cat.id 
                      ? "bg-white/20 text-white" 
                      : "bg-muted text-muted-foreground border border-border/30"
                  }`}>
                    {cat.productCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-4 z-50 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} seller={seller} />
      <ImageLightboxModal
        open={lightboxImages.length > 0}
        onClose={() => setLightboxImages([])}
        images={lightboxImages}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}

function ProductCard({
  product,
  layout,
  onClick,
  onOpenLightbox,
}: {
  product: Product;
  layout: "square" | "portrait";
  onClick: () => void;
  onOpenLightbox: (imgs: { url: string; id?: number }[], idx?: number) => void;
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
        <div className={`${layout === "portrait" ? "aspect-[3/4]" : "aspect-square"} bg-muted overflow-hidden relative group/img`}>
          {primaryImage && !imageError ? (
            <>
              <img
                src={imgSrc(primaryImage.url) + "?w=400"}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLightbox(product.images, 0);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-80 sm:opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-xs z-10 cursor-pointer"
                title="Zoom image"
                aria-label="Zoom image"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
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
