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
  useReorderProductImages,
  RequestUploadUrlBodyContentType,
  listProducts,
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash, Share2, Upload, X, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Key used to pass failed-upload metadata from the create flow to the edit page via sessionStorage. */
const retryStorageKey = (productId: number) => `chatcart_pendingRetry_${productId}`;

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
  file: File;
  name: string;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UploadResult {
  id: string;
  name: string;
  status: "done" | "error";
  error?: string;
}

/** Items persisted in sessionStorage to show retry UI on the edit page. */
interface RetryItem {
  name: string;
  error?: string;
}

interface OrderedImage {
  id: number;
  url: string;
  displayOrder: number;
}

// ── Sortable image thumbnail ──────────────────────────────────────────────────

interface SortableImageProps {
  img: OrderedImage;
  isPrimary: boolean;
  onDelete: (id: number) => void;
}

function SortableImage({ img, isPrimary, onDelete }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 touch-none"
    >
      <img
        src={imgSrc(img.url)}
        alt="Product"
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Drag handle — full tile is draggable via listeners */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />

      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none pointer-events-none">
          Primary
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Drag indicator */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
        <GripVertical className="w-4 h-4 text-white drop-shadow" />
      </div>
    </div>
  );
}

// ── Uploading file thumbnail (in-progress or error) ───────────────────────────

interface UploadingThumbProps {
  entry: UploadingFile;
  onRetry: (entry: UploadingFile) => void;
  onDismiss: (id: string) => void;
}

function UploadingThumb({ entry, onRetry, onDismiss }: UploadingThumbProps) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
      <img src={entry.preview} alt={entry.name} className="w-full h-full object-cover opacity-40" />

      {entry.status === "uploading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
          <Loader2 className="w-6 h-6 text-white animate-spin drop-shadow" />
          <span className="text-[10px] text-white mt-1 font-medium drop-shadow">Uploading…</span>
        </div>
      )}

      {entry.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/50 gap-1 p-1">
          <AlertCircle className="w-5 h-5 text-red-200" />
          <p className="text-[9px] text-red-100 text-center leading-tight line-clamp-2">{entry.error ?? "Upload failed"}</p>
          <button
            onClick={() => onRetry(entry)}
            className="mt-0.5 flex items-center gap-0.5 bg-white/90 text-red-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full hover:bg-white transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Retry
          </button>
          <button
            onClick={() => onDismiss(entry.id)}
            className="absolute top-0.5 right-0.5 text-white/70 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const reorderProductImages = useReorderProductImages();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-flight / failed uploads for saved products
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Queue of photos selected on the "new product" form before the product is saved
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // Whether a post-create upload batch is in progress
  const [isUploadingAfterCreate, setIsUploadingAfterCreate] = useState(false);

  // Items loaded from sessionStorage — failed uploads from a previous create attempt
  const [retryItems, setRetryItems] = useState<RetryItem[]>([]);

  // Local ordered image list — drives the drag-to-reorder UI
  const [orderedImages, setOrderedImages] = useState<OrderedImage[]>([]);
  const orderedImagesRef = useRef<OrderedImage[]>([]);
  orderedImagesRef.current = orderedImages;

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockCount, setStockCount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [showWhenOutOfStock, setShowWhenOutOfStock] = useState(false);

  useEffect(() => {
    if (product && !isNew) {
      setName(product.name);
      setSku(product.sku || "");
      setDescription(product.description || "");
      setPrice(product.price != null ? product.price.toString() : "");
      setStockCount(product.stockCount.toString());
      setCategoryId(product.categoryId?.toString() || "");
      setStatus(product.status);
      setShowWhenOutOfStock(product.showWhenOutOfStock);
    }
  }, [product, isNew]);

  // Sync orderedImages from product data, but preserve local order during active drag sessions
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (product?.images && !isDragging) {
      setOrderedImages(
        [...product.images].sort((a, b) => a.displayOrder - b.displayOrder)
      );
    }
  }, [product?.images, isDragging]);

  // On the edit page, check sessionStorage for failed uploads from the create flow
  useEffect(() => {
    if (!isNew && productId) {
      const key = retryStorageKey(productId);
      const raw = sessionStorage.getItem(key);
      if (raw) {
        try {
          setRetryItems(JSON.parse(raw) as RetryItem[]);
        } catch {
          // ignore malformed data
        }
        sessionStorage.removeItem(key);
      }
    }
  }, [isNew, productId]);

  // dnd-kit sensors — pointer for mouse, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Compute the new order synchronously using the current ref value
      const current = orderedImagesRef.current;
      const oldIndex = current.findIndex((img) => img.id === active.id);
      const newIndex = current.findIndex((img) => img.id === over.id);
      const next = arrayMove(current, oldIndex, newIndex);

      setOrderedImages(next);

      reorderProductImages.mutate(
        {
          productId,
          data: {
            items: next.map((img, index) => ({
              id: img.id,
              displayOrder: index,
            })),
          },
        },
        {
          onError: () => {
            toast({ title: "Failed to save image order", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
          },
        }
      );
    },
    [productId, reorderProductImages, queryClient, toast]
  );

  /**
   * Upload a single file to an already-created product.
   */
  const uploadSingleFile = async (
    file: File,
    entryId: string,
    targetProductId: number,
    displayOrder: number
  ): Promise<UploadResult> => {
    try {
      const { uploadURL } = await requestUploadUrl.mutateAsync({
        data: {
          productId: targetProductId,
          name: file.name,
          size: file.size,
          contentType: file.type as RequestUploadUrlBodyContentType,
          displayOrder,
        },
      });

      const res = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status} ${res.statusText})`);
      }

      setUploadingFiles((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: "done" } : e))
      );
      return { id: entryId, name: file.name, status: "done" };
    } catch (err: any) {
      setUploadingFiles((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, status: "error", error: err.message } : e
        )
      );
      return { id: entryId, name: file.name, status: "error", error: err.message };
    }
  };

  /**
   * Upload a batch of pending files to an already-created product.
   */
  const uploadFilesToProduct = async (
    files: PendingFile[],
    targetProductId: number,
    existingImageCount: number
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: "uploading" } : f))
      );

      try {
        const { uploadURL } = await requestUploadUrl.mutateAsync({
          data: {
            productId: targetProductId,
            name: entry.file.name,
            size: entry.file.size,
            contentType: entry.file.type as RequestUploadUrlBodyContentType,
            displayOrder: existingImageCount + i,
          },
        });

        const res = await fetch(uploadURL, {
          method: "PUT",
          body: entry.file,
          headers: { "Content-Type": entry.file.type },
        });

        if (!res.ok) {
          throw new Error(`Upload failed (${res.status} ${res.statusText})`);
        }

        setPendingFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: "done" } : f))
        );
        results.push({ id: entry.id, name: entry.file.name, status: "done" });
      } catch (err: any) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "error", error: err.message } : f
          )
        );
        results.push({ id: entry.id, name: entry.file.name, status: "error", error: err.message });
      }
    }

    return results;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Product name is required", variant: "destructive" });
      return;
    }

    const resolvedCategoryId =
      categoryId && categoryId !== "unassigned" ? Number(categoryId) : null;
    const resolvedPrice = price.trim() !== "" ? Number(price) : undefined;
    const resolvedSku = sku.trim() || undefined;

    // Soft SKU uniqueness check
    if (resolvedSku) {
      try {
        const existing = await listProducts({ search: resolvedSku });
        const duplicate = existing?.find(
          (p) => p.sku?.toLowerCase() === resolvedSku.toLowerCase() && p.id !== productId
        );
        if (duplicate) {
          const proceed = window.confirm(
            `This SKU is already used by "${duplicate.name}" — save anyway?`
          );
          if (!proceed) return;
        }
      } catch {
        // Non-blocking — proceed if the check fails
      }
    }

    try {
      if (isNew) {
        const newProduct = await createProduct.mutateAsync({
          data: {
            name,
            sku: resolvedSku,
            description: description || undefined,
            price: resolvedPrice ?? 0,
            stockCount: Number(stockCount) || 0,
            categoryId: resolvedCategoryId ?? undefined,
          },
        });

        const newId = newProduct.id;

        if (pendingFiles.length > 0) {
          setIsUploadingAfterCreate(true);
          const snapshot = [...pendingFiles];
          const results = await uploadFilesToProduct(snapshot, newId, 0);
          setIsUploadingAfterCreate(false);

          const failed = results.filter((r) => r.status === "error");
          if (failed.length > 0) {
            sessionStorage.setItem(
              retryStorageKey(newId),
              JSON.stringify(failed.map((r) => ({ name: r.name, error: r.error })))
            );
            toast({
              title: `${failed.length} photo${failed.length > 1 ? "s" : ""} failed to upload`,
              description: "You can re-add them from the product page.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Product created successfully" });
          }
        } else {
          toast({ title: "Product created successfully" });
        }

        setLocation(`/products/${newId}`);
      } else {
        await updateProduct.mutateAsync({
          productId,
          data: {
            name,
            sku: resolvedSku ?? "",
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
        setLocation("/products");
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
      ? `https://chatcart.in/store/${meData.subdomain}/p/${productId}`
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

  const validateFiles = (files: FileList | null): File[] => {
    if (!files || files.length === 0) return [];
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
    return valid;
  };

  const handleFilesSelected = async (files: FileList | null) => {
    const valid = validateFiles(files);
    if (valid.length === 0) return;

    if (isNew) {
      const entries: PendingFile[] = valid.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        preview: URL.createObjectURL(f),
        status: "pending" as const,
      }));
      setPendingFiles((prev) => [...prev, ...entries]);
      return;
    }

    // Saved product — upload immediately, keep in uploadingFiles for progress display
    const entries: UploadingFile[] = valid.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "uploading" as const,
    }));
    setUploadingFiles((prev) => [...prev, ...entries]);

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const entry = entries[i];
      const existingCount = (product?.images?.length ?? 0) + i;
      const result = await uploadSingleFile(file, entry.id, productId, existingCount);
      if (result.status === "done") {
        // Remove done entries and refresh images
        setUploadingFiles((prev) => prev.filter((e) => e.id !== entry.id));
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      }
    }
  };

  const handleRetryUpload = async (entry: UploadingFile) => {
    setUploadingFiles((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: "uploading", error: undefined } : e))
    );
    const existingCount = (product?.images?.length ?? 0);
    const result = await uploadSingleFile(entry.file, entry.id, productId, existingCount);
    if (result.status === "done") {
      setUploadingFiles((prev) => prev.filter((e) => e.id !== entry.id));
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
    }
  };

  const handleDismissUploadError = (id: string) => {
    setUploadingFiles((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  };

  const handleRemovePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteProductImage.mutateAsync({ productId, imageId });
      setOrderedImages((prev) => prev.filter((img) => img.id !== imageId));
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      toast({ title: "Image removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove image", variant: "destructive" });
    }
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading product...</div>;
  }

  const isSaving = createProduct.isPending || updateProduct.isPending;
  const hasPendingFiles = pendingFiles.length > 0;
  const hasExistingOrUploading = orderedImages.length > 0 || uploadingFiles.length > 0;

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
          <Button onClick={handleSave} disabled={isSaving || isUploadingAfterCreate}>
            {isUploadingAfterCreate ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? "Create" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Post-create upload progress banner ── */}
      {isUploadingAfterCreate && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Uploading photos…</p>
            <p className="text-xs text-indigo-600">
              {pendingFiles.filter((f) => f.status === "done").length} of {pendingFiles.length} done — please wait
            </p>
          </div>
        </div>
      )}

      {/* ── Retry banner (edit page — failed uploads from previous create) ── */}
      {!isNew && retryItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {retryItems.length} photo{retryItems.length > 1 ? "s" : ""} couldn't be uploaded
            </p>
            <p className="text-xs text-amber-700 truncate">
              {retryItems.map((r) => r.name).join(", ")} — tap Re-add to try again
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => {
              setRetryItems([]);
              fileInputRef.current?.click();
            }}
          >
            Re-add
          </Button>
        </div>
      )}

      {/* ── Photos ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Product Photos</h2>
            <p className="text-sm text-slate-500">
              {!isNew && orderedImages.length > 1
                ? "Drag to reorder · first photo is the storefront thumbnail"
                : "JPG, PNG, WebP · max 5 MB each"}
            </p>
          </div>
          {(!isNew || hasPendingFiles) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={requestUploadUrl.isPending || isUploadingAfterCreate}
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
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />

        {isNew && !hasPendingFiles ? (
          /* Empty drop-zone for new products */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
          >
            <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
            <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
              Tap to add photos
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Photos will be attached when you tap Create
            </p>
          </div>
        ) : isNew && hasPendingFiles ? (
          /* Pending thumbnails on new product */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {pendingFiles.map((f) => (
              <div
                key={f.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
              >
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover opacity-75" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {f.status === "pending" && (
                    <div className="bg-black/40 rounded-full p-1.5">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {f.status === "uploading" && (
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin drop-shadow" />
                  )}
                  {f.status === "done" && (
                    <div className="bg-green-500/80 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {f.status === "error" && (
                    <div className="bg-red-500/80 rounded-full p-1">
                      <X className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                {f.status === "pending" && (
                  <button
                    onClick={() => handleRemovePendingFile(f.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {!isUploadingAfterCreate && (
              <div
                className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>
        ) : !hasExistingOrUploading ? (
          /* No images yet on saved product */
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Click or drag images here</p>
          </div>
        ) : (
          /* Saved product with images — drag-to-reorder grid */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedImages.map((img) => img.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {orderedImages.map((img, index) => (
                  <SortableImage
                    key={img.id}
                    img={img}
                    isPrimary={index === 0}
                    onDelete={handleDeleteImage}
                  />
                ))}

                {/* In-flight / error uploads */}
                {uploadingFiles.map((f) => (
                  <UploadingThumb
                    key={f.id}
                    entry={f}
                    onRetry={handleRetryUpload}
                    onDismiss={handleDismissUploadError}
                  />
                ))}

                {/* Add more button */}
                <div
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Product Details ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          {/* Name + Price */}
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

          {/* SKU — internal only */}
          <div className="space-y-2">
            <Label>
              SKU{" "}
              <span className="text-slate-400 font-normal">(optional — internal, never shown to customers)</span>
            </Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. RING-014"
              className="font-mono"
            />
            <p className="text-xs text-slate-400">
              Your internal reference code for this item. Only visible to you in the dashboard.
            </p>
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
