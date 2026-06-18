import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useGetProduct, useCreateProduct, useUpdateProduct, useListCategories, getGetProductQueryKey, ProductStatus, useDeleteProduct, useGetMe } from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash, Share2 } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

export default function ProductDetail() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProductDetailContent />
      </Layout>
    </ProtectedRoute>
  );
}

function ProductDetailContent() {
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const productId = isNew ? 0 : parseInt(params.id as string, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useGetProduct(productId, {
    query: {
      enabled: !isNew && !!productId,
      queryKey: getGetProductQueryKey(productId)
    }
  });

  const { data: meData } = useGetMe();
  const { data: categories } = useListCategories();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockCount, setStockCount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [showWhenOutOfStock, setShowWhenOutOfStock] = useState(false);

  useEffect(() => {
    if (product && !isNew) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price.toString());
      setStockCount(product.stockCount.toString());
      setCategoryId(product.categoryId?.toString() || "");
      setStatus(product.status);
      setShowWhenOutOfStock(product.showWhenOutOfStock);
    }
  }, [product, isNew]);

  const handleSave = async () => {
    if (!name || !price) {
      toast({ title: "Validation Error", description: "Name and price are required", variant: "destructive" });
      return;
    }

    const resolvedCategoryId =
      categoryId && categoryId !== "unassigned" ? Number(categoryId) : null;

    try {
      if (isNew) {
        const newProduct = await createProduct.mutateAsync({
          data: {
            name,
            description,
            price: Number(price),
            stockCount: Number(stockCount) || 0,
            categoryId: resolvedCategoryId ?? undefined,
          }
        });
        toast({ title: "Product created successfully" });
        setLocation(`/products/${newProduct.id}`);
      } else {
        await updateProduct.mutateAsync({
          productId,
          data: {
            name,
            description,
            price: Number(price),
            stockCount: Number(stockCount) || 0,
            categoryId: resolvedCategoryId ?? undefined,
            status: status as ProductStatus,
            showWhenOutOfStock
          }
        });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
        toast({ title: "Product updated successfully" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save product", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct.mutateAsync({ productId });
      toast({ title: "Product deleted" });
      setLocation("/products");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete product", variant: "destructive" });
    }
  };

  const handleShare = () => {
    const storeName = meData?.storeName ?? "";
    const storeSlug = storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const productUrl = storeSlug
      ? `https://${storeSlug}.chatcart.in/p/${productId}`
      : `https://chatcart.in/p/${productId}`;
    const text = encodeURIComponent(`Check out ${name} for ₹${price}!\n${productUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading product...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/products" className="p-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isNew ? "New Product" : "Edit Product"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteProduct.isPending}>
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isNew ? "Create" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wireless Earbuds" />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the product..." rows={4} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stock Count</Label>
              <Input type="number" value={stockCount} onChange={e => setStockCount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isNew && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 h-full pt-6">
                <Switch id="show-oos" checked={showWhenOutOfStock} onCheckedChange={setShowWhenOutOfStock} />
                <Label htmlFor="show-oos">Show when out of stock</Label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
