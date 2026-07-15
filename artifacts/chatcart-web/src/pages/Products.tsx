import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useListProducts,
  useDeleteProduct,
  useListCategories,
  getListProductsQueryKey,
  type ListProductsParams,
} from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Search, Package, Trash2, ArrowUp, QrCode, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getToken } from "@/lib/auth";

export default function Products() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProductsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ProductsContent() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: categories } = useListCategories();
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("default");
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const toggleSelectAll = (checked: boolean) => {
    if (checked && products) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, productId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handleBulkCategory = async () => {
    if (selectedIds.length === 0) return;
    if (bulkCategoryId === "default") {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }

    setIsBulkLoading(true);
    const token = getToken();
    try {
      const catId = bulkCategoryId === "null" ? null : parseInt(bulkCategoryId);
      const res = await fetch("/api/products/bulk-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds: selectedIds,
          categoryId: catId
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update bulk categories");
      }

      toast({ title: `Successfully updated ${selectedIds.length} products` });
      setSelectedIds([]);
      setBulkCategoryId("default");
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to apply category in bulk",
        variant: "destructive"
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkStatus = async (status: "active" | "out_of_stock" | "hidden" | "deleted") => {
    if (selectedIds.length === 0) return;

    if (status === "deleted") {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${selectedIds.length} products?`
      );
      if (!confirmDelete) return;
    }

    setIsBulkLoading(true);
    const token = getToken();
    try {
      const res = await fetch("/api/products/bulk-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds: selectedIds,
          status
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update bulk status");
      }

      toast({ title: `Successfully updated ${selectedIds.length} products to ${status}` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to apply bulk status",
        variant: "destructive"
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkStock = async (stockCount: number) => {
    if (selectedIds.length === 0) return;

    setIsBulkLoading(true);
    const token = getToken();
    try {
      const res = await fetch("/api/products/bulk-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          productIds: selectedIds,
          stockCount
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update bulk stock");
      }

      toast({ title: `Successfully set ${selectedIds.length} products to unlimited stock` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to apply bulk stock",
        variant: "destructive"
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const [showImport, setShowImport] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const startImport = async () => {
    setIsImportLoading(true);
    setImportError(null);
    setQrCode(null);
    setImportCount(null);
    setImportStatus("Initializing scanning session...");
    setShowImport(true);

    const token = getToken();
    try {
      const res = await fetch("/api/sellers/wa-import/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to initialize session");
      }
      const data = await res.json();
      setSessionId(data.sessionId);
      
      // Start EventSource
      const es = new EventSource(`/api/sellers/wa-import/stream/${data.sessionId}?token=${encodeURIComponent(token || "")}`);
      setEventSource(es);

      es.addEventListener("qr", (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          setQrCode(parsed.qr);
          setImportStatus("Please scan the QR code on your mobile device to begin importing.");
        } catch (e) {
          console.error("Failed to parse QR event data", e);
        }
      });

      es.addEventListener("status", (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          setImportStatus(parsed.message);
          setQrCode(null); // Clear QR once scanned/status changes
        } catch (e) {
          console.error("Failed to parse status event data", e);
        }
      });

      es.addEventListener("error", (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          setImportError(parsed.message);
          es.close();
        } catch (e) {
          setImportError("Import failed");
          es.close();
        }
      });

      es.addEventListener("complete", (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          setImportCount(parsed.count);
          setImportStatus(`Catalog imported successfully!`);
          es.close();
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        } catch (e) {
          setImportStatus("Catalog imported!");
          es.close();
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        }
      });

    } catch (err: any) {
      setImportError(err.message || "Failed to initialize import session");
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleCloseImport = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setShowImport(false);
    setSessionId(null);
    setQrCode(null);
    setImportStatus("");
    setImportError(null);
    setImportCount(null);
  };

  const params: ListProductsParams = {
    status:
      statusTab === "all"
        ? undefined
        : (statusTab as ListProductsParams["status"]),
    search: search || undefined,
  };

  const { data: products, isLoading } = useListProducts(params, {
    query: {
      queryKey: getListProductsQueryKey(params),
    },
  });

  const deleteProduct = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator?.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isMobileUA || window.innerWidth < 1024;
  });

  useEffect(() => {
    const ua = window.navigator?.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const checkMobile = () => {
      setIsMobile(isMobileUA || window.innerWidth < 1024);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleDelete = async (productId: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(productId);
    try {
      await deleteProduct.mutateAsync({ productId });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: "Product deleted" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="flex justify-between gap-4"
        style={{
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your catalogue and inventory
          </p>
        </div>
        <div
          className="flex items-center flex-wrap gap-2"
          style={{ width: isMobile ? "100%" : "auto" }}
        >
          <Button
            onClick={startImport}
            variant="outline"
            className="flex-1 justify-center h-9 text-xs sm:text-sm px-3 py-2 border-slate-200 text-slate-700 hover:text-slate-900 font-medium"
            style={{ flexGrow: isMobile ? 1 : 0 }}
          >
            <QrCode className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
            Import from WhatsApp
          </Button>
          <Link
            href="/products/new"
            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-3 py-2"
            style={{ flexGrow: isMobile ? 1 : 0 }}
          >
            <Plus className="w-4 h-4 mr-2 shrink-0" />
            Add Product
          </Link>
        </div>
      </div>

      <div
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex justify-between gap-4"
        style={{
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <Tabs
          value={statusTab}
          onValueChange={setStatusTab}
          className="overflow-hidden"
          style={{ width: isMobile ? "100%" : "auto" }}
        >
          <div className="overflow-x-auto pb-1 -mb-1 w-full no-scrollbar">
            <TabsList className="bg-slate-100/50 p-1 inline-flex min-w-full lg:min-w-0">
              <TabsTrigger value="all" className="whitespace-nowrap">All</TabsTrigger>
              <TabsTrigger value="active" className="whitespace-nowrap">Active</TabsTrigger>
              <TabsTrigger value="out_of_stock" className="whitespace-nowrap">Out of Stock</TabsTrigger>
              <TabsTrigger value="hidden" className="whitespace-nowrap">Hidden</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div
          className="relative"
          style={{ width: isMobile ? "100%" : "18rem" }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            Loading products...
          </div>
        ) : products && products.length > 0 ? (
          <div className="divide-y divide-slate-100">
            <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50/85 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <input
                type="checkbox"
                checked={selectedIds.length === products.length && products.length > 0}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer shrink-0"
              />
              <span>Select All Products ({products.length})</span>
            </div>
            {products.map((product) => (
              <div
                key={product.id}
                className="p-4 flex hover:bg-slate-50 transition-colors gap-3"
                style={{
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "between",
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={(e) => toggleSelectOne(product.id, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {product.images?.[0] ? (
                      <ProductThumb url={product.images[0].url} name={product.name} />
                    ) : (
                      <Package className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {product.name}
                    </h3>
                    {product.sku && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        SKU: {product.sku}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{product.price}
                      </span>
                      {product.categoryName && (
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                          {product.categoryName}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.status === "active"
                            ? "bg-green-100 text-green-700"
                            : product.status === "out_of_stock"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {product.status === "active"
                          ? "Active"
                          : product.status === "out_of_stock"
                            ? "Out of Stock"
                            : "Hidden"}
                      </span>
                      {isMobile && (
                        <span className="text-xs text-slate-500">
                          • {product.stockCount === 0 ? "Unlimited" : `${product.stockCount} stock`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 shrink-0 pl-8 lg:pl-0"
                  style={{
                    width: isMobile ? "100%" : "auto",
                    justifyContent: isMobile ? "space-between" : "flex-end",
                  }}
                >
                  {!isMobile && (
                    <span className="text-sm text-slate-500">
                      {product.stockCount === 0 ? "Unlimited" : `${product.stockCount} in stock`}
                    </span>
                  )}
                  <div className="flex items-center gap-2 ml-auto lg:ml-0">
                    <Link
                      href={`/products/${product.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs lg:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 lg:h-8 px-2.5 lg:px-3"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deletingId === product.id}
                      className="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-slate-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 lg:h-8 lg:w-8"
                      aria-label="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">
              No products found
            </h3>
            <p className="text-slate-500 mt-1 mb-6">
              Start building your catalogue by adding your first product.
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Link>
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      <Dialog open={showImport} onOpenChange={(open) => !open && handleCloseImport()}>
        <DialogContent className="sm:max-w-[450px] p-6 bg-white rounded-xl shadow-lg border border-slate-100 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center">
              <QrCode className="w-5 h-5 mr-2 text-emerald-500" />
              Import WhatsApp Catalog
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-1">
              Onboard your catalogue in seconds. Scan the QR code using Link Device inside your WhatsApp app.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-2 space-y-3 w-full">
            {importError ? (
              <div className="text-center space-y-2">
                <div className="text-red-500 font-semibold">Import Failed</div>
                <p className="text-sm text-slate-500 max-w-[320px]">{importError}</p>
                <Button onClick={startImport} variant="outline" className="mt-2">
                  Try Again
                </Button>
              </div>
            ) : importCount !== null ? (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <div className="text-emerald-600 font-semibold text-lg">Import Complete!</div>
                <p className="text-sm text-slate-500 max-w-[320px]">
                  Successfully imported <strong>{importCount}</strong> products and their collections into your shop.
                </p>
                <Button onClick={handleCloseImport} className="mt-4 bg-primary text-primary-foreground shadow hover:bg-primary/90">
                  Done
                </Button>
              </div>
            ) : qrCode ? (
              <div className="space-y-3 text-center w-full">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block shadow-inner">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-[170px] h-[170px] aspect-square rounded-lg" />
                </div>
                <p className="text-xs text-slate-600 max-w-[320px] mx-auto font-medium">
                  {importStatus}
                </p>
                <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-left text-[11px] text-amber-800 w-full max-w-[380px] mx-auto space-y-1 shadow-sm">
                  <div className="font-semibold flex items-center text-amber-900 text-xs">
                    🔒 Security Notice
                  </div>
                  <p className="leading-relaxed text-amber-700">
                    WhatsApp may show a safety warning stating that a device in <strong>Austin, Texas</strong> is connecting.
                  </p>
                  <p className="leading-relaxed text-amber-700">
                    This is <strong>perfectly normal</strong> because our secure import server runs on Oracle Cloud (registered in Austin). We only read your catalog, and the session will <strong>automatically log out</strong> immediately after the import completes (usually under 10 seconds).
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                <p className="text-sm text-slate-500 max-w-[300px] mx-auto font-medium">
                  {importStatus || "Connecting to WhatsApp..."}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4 flex-wrap max-w-[95vw] lg:max-w-4xl border border-slate-800 animate-in slide-in-from-bottom duration-200">
          <span className="text-sm font-semibold text-emerald-400 shrink-0">
            {selectedIds.length} Selected
          </span>
          <div className="h-4 w-px bg-slate-700 hidden lg:block" />
          
          <div className="flex items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-md text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              <option value="default" disabled>Change Category...</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="null">Uncategorized (General)</option>
            </select>
            <Button
              onClick={handleBulkCategory}
              disabled={isBulkLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs font-medium"
            >
              {isBulkLoading ? "Applying..." : "Apply"}
            </Button>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden md:block" />

          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => handleBulkStatus("active")}
              disabled={isBulkLoading}
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-7 px-2.5 font-medium"
            >
              Set Active
            </Button>
            <Button
              onClick={() => handleBulkStock(0)}
              disabled={isBulkLoading}
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-7 px-2.5 font-medium"
            >
              Unlimited Stock
            </Button>
            <Button
              onClick={() => handleBulkStatus("out_of_stock")}
              disabled={isBulkLoading}
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-7 px-2.5 font-medium"
            >
              Out of Stock
            </Button>
            <Button
              onClick={() => handleBulkStatus("hidden")}
              disabled={isBulkLoading}
              variant="outline"
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs h-7 px-2.5 font-medium"
            >
              Hide
            </Button>
            <Button
              onClick={() => handleBulkStatus("deleted")}
              disabled={isBulkLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-7 px-2.5 font-semibold"
            >
              Delete
            </Button>
          </div>

          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-white transition-colors ml-auto font-medium"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function imgSrc(url: string): string {
  return url.replace(/^\/objects\//, "/api/public/img/");
}

function ProductThumb({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState(false);
  if (error) return <Package className="w-5 h-5 text-slate-300" />;
  return (
    <img
      src={imgSrc(url)}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}
