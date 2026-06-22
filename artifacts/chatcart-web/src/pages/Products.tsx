import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useListProducts,
  useDeleteProduct,
  getListProductsQueryKey,
  type ListProductsParams,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your catalogue and inventory
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Tabs
          value={statusTab}
          onValueChange={setStatusTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-slate-100/50 p-1">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
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
            {products.map((product) => (
              <div
                key={product.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-sm text-slate-500 hidden sm:block">
                    {product.stockCount} in stock
                  </span>
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deletingId === product.id}
                    className="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
    </div>
  );
}

function ProductThumb({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState(false);
  if (error) return <Package className="w-5 h-5 text-slate-300" />;
  return (
    <img
      src={url}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}
