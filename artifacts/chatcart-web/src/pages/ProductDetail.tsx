import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useGetProduct,
  useCreateProduct,
  useUpdateProduct,
  useListCategories,
  getGetProductQueryKey,
  ProductStatus,
  useDeleteProduct,
  useGetMe,
  useRequestUploadUrl,
  useDeleteProductImage,
  RequestUploadUrlBodyContentType,
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash, Share2, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function imgSrc(url: string): string {
  if (url.startsWith("/objects/")) {
    return `/api/public/img/${url.slice("/objects/".length)}`;
  }
  return url;
}

function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

export default function ProductDetail() {
  return (
    <ProtectedRoute>
      <Layout>
        <ProductDetailContent />
      </Layout>
    </ProtectedRoute>
  );
}

interface UploadingFile {
  id: string;
  name: string;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
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
      queryKey: getGetProductQueryKey(productId),
    },
  });

  const { data: meData } = useGetMe();
  const { data: categories } = useListCategories();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const requestUploadUrl = useRequestUploadUrl();
  const deleteProductImage = useDeleteProductImage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

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
      setPrice(product.price != null ? product.price.toString() : "");
      setStockCount(product.stockCount.toString());
      setCategoryId(product.categoryId?.toString() || "");
      setStatus(product.status);
      setShowWhenOutOfStock(product.showWhenOutOfStock);
    }
  }, [product, isNew]);

  // Auto-open file picker when navigated here after auto-save (?upload=1)
  useEffect(() => {
    if (!isNew && !isLoading) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upload") === "1") {
        const timer = setTimeout(() => fileInputRef.current?.click(), 400);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [isNew, isLoading]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Product name is required", variant: "destructive" });
      return;
    }

    const resolvedCategoryId =
      categoryId && categoryId !== "unassigned" ? Number(categoryId) : null;
    const resolvedPrice = price.trim() !== "" ? Number(price) : undefined;

    try {
      if (isNew) {
        const newProduct = await createProduct.mutateAsync({
          data: {
            name,
            description: description || undefined,
            price: resolvedPrice ?? 0,
            stockCount: Number(stockCount) || 0,
            categoryId: resolvedCategoryId ?? undefined,
          },
        });
        toast({ title: "Product created — add photos below" });
        setLocation(`/products/${newProduct.id}`);
      } else {
        await updateProduct.mutateAsync({
          productId,
          data: {
            name,
            description,
            price: resolvedPrice,
            stockCount: Number(stockCount) || 0,
            categoryId: resolvedCategoryId ?? undefined,
            status: status as ProductStatus,
            showWhenOutOfStock,
          },
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
    const wa = meData?.whatsappNumber ?? "";
    const phone = normalizeWhatsAppNumber(wa);
    const productUrl = meData?.subdomain
      ? `https://${meData.subdomain}.chatcart.in/p/${productId}`
      : `https://chatcart.in/p/${productId}`;
    const text = encodeURIComponent(`Check out ${name} for ₹${price}!\n${productUrl}`);
    if (!phone) {
      toast({
        title: "WhatsApp number not set",
        description: "Please set your WhatsApp number in Settings first.",
        variant: "destructive",
      });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  // For NEW products: auto-save with name then redirect to edit mode
  const handleNewProductPhotoZoneClick = async () => {
    if (!name.trim()) {
      toast({
        title: "Add a product name first",
        description: "Enter a name below, then tap here to add photos.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newProduct = await createProduct.mutateAsync({
        data: { name, price: 0, stockCount: 0 },
      });
      toast({ title: "Product saved — add your photos now" });
      setLocation(`/products/${newProduct.id}?upload=1`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save product", variant: "destructive" });
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || isNew) return;

    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: `${file.name}: unsupported type`, description: "Only JPG, PNG, WebP allowed.", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast({ title: `${file.name}: too large`, description: "Max 5 MB per image.", variant: "destructive" });
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    const entries: UploadingFile[] = valid.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "uploading" as const,
    }));
    setUploadingFiles((prev) => [...prev, ...entries]);

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const entry = entries[i];
      try {
        const existingCount = (product?.images?.length ?? 0) + i;

        // The server verifies product ownership, creates the product_images row
        // atomically, and returns a presigned URL for the upload — no orphaned files.
        const { uploadURL } = await requestUploadUrl.mutateAsync({
          data: {
            productId,
            name: file.name,
            size: file.size,
            contentType: file.type as RequestUploadUrlBodyContentType,
            displayOrder: existingCount,
          },
        });

        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setUploadingFiles((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: "done" } : e))
        );
      } catch (err: any) {
        setUploadingFiles((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: "error", error: err.message } : e
          )
        );
        toast({ title: `Failed to upload ${file.name}`, variant: "destructive" });
      }
    }

    queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
    setUploadingFiles((prev) => prev.filter((e) => e.status !== "done"));
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteProductImage.mutateAsync({ productId, imageId });
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      toast({ title: "Image removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove image", variant: "destructive" });
    }
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading product...</div>;
  }

  const existingImages = product?.images ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
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

      {/* ── Photos (always first, most prominent) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Product Photos</h2>
            <p className="text-sm text-slate-500">
              {isNew ? "Save the product first to add photos" : "JPG, PNG, WebP · max 5 MB each"}
            </p>
          </div>
          {!isNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={requestUploadUrl.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Images
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {isNew ? (
          /* Big tap-target for new products */
          <div
            onClick={handleNewProductPhotoZoneClick}
            className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
          >
            {createProduct.isPending ? (
              <Loader2 className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-spin" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
            )}
            <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
              {createProduct.isPending ? "Saving product…" : "Tap to add photos"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Enter a product name below, then tap here
            </p>
          </div>
        ) : existingImages.length === 0 && uploadingFiles.length === 0 ? (
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Click or drag images here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {existingImages.map((img) => (
              <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={imgSrc(img.url)}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {uploadingFiles.map((f) => (
              <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img src={f.preview} alt={f.name} className="w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {f.status === "uploading" && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
                  {f.status === "error" && <X className="w-6 h-6 text-red-500" />}
                </div>
              </div>
            ))}
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* ── Product Details ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          {/* Name (required) + Price (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Item Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gold Stud Earrings"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Price (₹){" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Leave blank for 'Price on request'"
              />
              {!price && (
                <p className="text-xs text-slate-400">
                  Customers will see "Price on request" and can message you.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>
              Description{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product..."
              rows={4}
            />
          </div>

          {/* Stock + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Stock Count{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="number"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Category{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status (edit only) */}
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
