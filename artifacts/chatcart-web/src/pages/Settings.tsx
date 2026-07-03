import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useGetMe,
  useUpdateSeller,
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";

async function uploadLogoToApi(file: File): Promise<{ objectPath: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("chatcart_token");
  const res = await fetch("/api/storage/uploads/logo", {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return res.json();
}
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Edit2, Trash, X, Check, Upload, Loader2, Image as ImageIcon, Download, Lock, Crown, Zap, ArrowRight, Infinity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function imgSrc(url: string): string {
  if (url.startsWith("/objects/")) {
    return `/api/public/img/${url.slice("/objects/".length)}`;
  }
  return url;
}

type PlanName = "Starter" | "Growth" | "Pro" | "Lifetime";

function normalizePlan(plan: string | null | undefined): PlanName {
  if (plan === "pro" || plan === "business") return "Pro";
  if (plan === "growth" || plan === "basic") return "Growth";
  if (plan === "lifetime") return "Lifetime";
  return "Starter";
}

function planColor(planName: PlanName): string {
  if (planName === "Pro") return "text-purple-600";
  if (planName === "Lifetime") return "text-amber-600";
  if (planName === "Growth") return "text-blue-600";
  return "text-slate-600";
}

function planBadgeClass(planName: PlanName): string {
  if (planName === "Pro") return "bg-purple-100 text-purple-700 border-purple-200";
  if (planName === "Lifetime") return "bg-amber-100 text-amber-700 border-amber-200";
  if (planName === "Growth") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <Layout>
        <SettingsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: seller } = useGetMe();
  const updateSeller = useUpdateSeller();

  const planName = normalizePlan((seller as any)?.subscriptionPlan);
  const isPro = planName === "Pro" || planName === "Lifetime";
  const isGrowthOrPro = planName === "Growth" || planName === "Pro" || planName === "Lifetime";

  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [productImageLayout, setProductImageLayout] = useState<"square" | "portrait">("square");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; duplicates: string[] } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const RESERVED_SLUGS = new Set([
    "www", "api", "admin", "store", "app", "mail", "support", "help", "chatcart",
  ]);

  function validateSlug(slug: string): string | null {
    if (!slug) return null;
    if (slug.length < 3) return "Must be at least 3 characters.";
    if (slug.length > 30) return "Must be 30 characters or fewer.";
    if (!/^[a-z0-9-]+$/.test(slug)) return "Only lowercase letters, numbers, and hyphens allowed.";
    if (slug.startsWith("-") || slug.endsWith("-")) return "Cannot start or end with a hyphen.";
    if (RESERVED_SLUGS.has(slug)) return "This URL is reserved — please choose a different one.";
    return null;
  }

  const slugError = validateSlug(subdomain);

  useEffect(() => {
    if (seller) {
      setStoreName(seller.storeName || "");
      setWhatsappNumber(seller.whatsappNumber || "");
      setSubdomain((seller as any).subdomain || "");
      setBannerImageUrl((seller as any).bannerImageUrl ?? null);
      setTagline((seller as any).tagline ?? "");
      setProductImageLayout((seller as any).productImageLayout ?? "square");
    }
  }, [seller]);

  const handleSaveStore = async () => {
    if (slugError) {
      toast({ title: "Invalid store URL", description: slugError, variant: "destructive" });
      return;
    }
    const originalSubdomain = (seller as any)?.subdomain;
    if (originalSubdomain && subdomain !== originalSubdomain) {
      const ok = confirm(
        "Changing your store URL will break any links you've already shared with customers. Are you sure?"
      );
      if (!ok) return;
    }
    try {
      await updateSeller.mutateAsync({
        data: { storeName, whatsappNumber, subdomain, productImageLayout } as any
      });
      toast({ title: "Store settings updated" });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleSaveBranding = async () => {
    try {
      await updateSeller.mutateAsync({
        data: {
          bannerImageUrl: bannerImageUrl || null,
          tagline: tagline.trim() || null,
        } as any
      });
      toast({ title: "Branding saved" });
    } catch (err: any) {
      const apiError = err?.response?.data?.error || err.message || "Failed to save";
      toast({ title: "Error", description: apiError, variant: "destructive" });
    }
  };

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Only JPG, PNG, WebP allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const { objectPath } = await uploadLogoToApi(file);
      setBannerImageUrl(objectPath);
      toast({ title: "Logo uploaded — click Save to apply" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const token = localStorage.getItem("chatcart_token");
      const response = await fetch("/api/export", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "chatcart-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const token = localStorage.getItem("chatcart_token");
      const response = await fetch("/api/import-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ products: data.products, categories: data.categories }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Import failed");
      setImportResult(result);
      toast({ title: `Import complete — ${result.imported} products added` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const { data: categories } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editBulkPercent, setEditBulkPercent] = useState("");
  const [editBulkMinQty, setEditBulkMinQty] = useState("");

  const handleAddCategory = async () => {
    if (!newCatName) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCatName } });
      setNewCatName("");
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Category added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCatName) return;

    const pctRaw = editBulkPercent.trim();
    const qtyRaw = editBulkMinQty.trim();
    const bothBlank = pctRaw === "" && qtyRaw === "";
    const eitherSet = pctRaw !== "" || qtyRaw !== "";

    if (eitherSet && (pctRaw === "" || qtyRaw === "")) {
      toast({ title: "Set both fields", description: "Enter both a minimum quantity and a discount % — or leave both blank for no discount.", variant: "destructive" });
      return;
    }

    let discountNum: number | null = null;
    let minQtyNum: number | null = null;

    if (!bothBlank) {
      discountNum = parseFloat(pctRaw);
      if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
        toast({ title: "Invalid discount %", description: "Enter a value between 0 and 100.", variant: "destructive" });
        return;
      }
      minQtyNum = parseInt(qtyRaw, 10);
      if (isNaN(minQtyNum) || minQtyNum < 1 || String(minQtyNum) !== qtyRaw) {
        toast({ title: "Invalid minimum quantity", description: "Enter a whole number of 1 or more.", variant: "destructive" });
        return;
      }
    }

    try {
      await updateCategory.mutateAsync({ categoryId: id, data: { name: editCatName, dozenDiscountPercent: discountNum, bulkDiscountMinQty: minQtyNum } as any });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Category updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete category?")) return;
    try {
      await deleteCategory.mutateAsync({ categoryId: id });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Category deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your store details and categories</p>
      </div>

      {/* ── Subscription Plan ── */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {planName === "Lifetime" ? <Infinity className="w-5 h-5 text-amber-500" /> : planName === "Pro" ? <Crown className="w-5 h-5 text-purple-500" /> : <Zap className="w-5 h-5 text-blue-500" />}
              Your Plan
            </CardTitle>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${planBadgeClass(planName)}`}>
              {planName}
            </span>
          </div>
          <CardDescription>
            Your current subscription and what's included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Active products</p>
              <p className={`text-lg font-bold ${planColor(planName)}`}>
                {planName === "Starter" ? "Up to 25" : planName === "Growth" ? "Up to 100" : "Unlimited ∞"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Order history</p>
              <p className={`text-lg font-bold ${planColor(planName)}`}>
                {planName === "Starter" ? "Last 30 days" : "Full history"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Product variants</p>
              <p className={`text-lg font-bold ${planColor(planName)}`}>
                {isGrowthOrPro ? "Included" : "Growth & above"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Support</p>
              <p className={`text-sm font-bold ${planColor(planName)}`}>
                {isPro ? "WhatsApp + Phone, 24/7" : "Email support"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {planName === "Starter" ? "Within 24 hours" : planName === "Growth" ? "4-6 hour response" : "Instant response"}
              </p>
              {isPro && (
                <a
                  href="https://wa.me/919319724678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:underline font-medium"
                >
                  WhatsApp us · +91 93197 24678
                </a>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Storefront branding</p>
              <p className={`text-sm font-bold ${planColor(planName)}`}>
                {isPro ? "Hidden (white-label)" : "\"Powered by Chatcart\""}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPro ? "Your storefront has no Chatcart branding" : "Removed on Pro plan"}
              </p>
            </div>
          </div>
        </CardContent>
        {!isPro && (
          <CardFooter className="bg-slate-50 rounded-b-xl border-t border-slate-100">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-slate-600">
                {planName === "Starter"
                  ? "Upgrade to Growth for 100 products and variants."
                  : "Upgrade to Pro for unlimited products and branding."}
              </p>
              <Button size="sm" variant="outline" className="ml-4 shrink-0">
                <ArrowRight className="w-4 h-4 mr-1" />
                Upgrade
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* ── Store Details ── */}
      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
          <CardDescription>This information is visible to your customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Store Name</Label>
            <Input value={storeName} onChange={e => setStoreName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Number</Label>
            <Input
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="91XXXXXXXXXX or +91XXXXXXXXXX"
            />
            <p className="text-xs text-slate-500">
              Enter your 10-digit mobile number — country code (91) will be added automatically.
              This number receives customer orders via WhatsApp.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Store URL</Label>
            <Input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="e.g. sharma-general"
              className={slugError ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {slugError ? (
              <p className="text-xs text-red-500">{slugError}</p>
            ) : subdomain ? (
              <p className="text-xs text-slate-500">
                Your store will be live at{" "}
                <span className="font-medium text-slate-700">chatcart.in/store/{subdomain}</span>
                <span className="ml-1 text-slate-400">(live URL: {subdomain}.chatcart.in once deployed)</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400">Choose a custom slug for your store link.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Product Image Layout</Label>
            <p className="text-xs text-slate-500">
              Controls how product photos appear in your customer-facing storefront. Square suits jewellery and accessories; Portrait suits clothing and fashion.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setProductImageLayout("square")}
                className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${productImageLayout === "square" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200" />
                <span className={`text-xs font-semibold ${productImageLayout === "square" ? "text-primary" : "text-slate-600"}`}>Square (1:1)</span>
                <span className="text-xs text-slate-400 text-center leading-tight">Jewellery, accessories, general</span>
              </button>
              <button
                type="button"
                onClick={() => setProductImageLayout("portrait")}
                className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${productImageLayout === "portrait" ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="w-9 h-12 rounded-lg bg-slate-100 border border-slate-200" />
                <span className={`text-xs font-semibold ${productImageLayout === "portrait" ? "text-primary" : "text-slate-600"}`}>Portrait (3:4)</span>
                <span className="text-xs text-slate-400 text-center leading-tight">Clothing, sarees, fashion</span>
              </button>
            </div>
          </div>
          <Button onClick={handleSaveStore} disabled={updateSeller.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* ── Store Branding ── */}
      <Card className={!isPro ? "opacity-90" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Store Branding</CardTitle>
            {!isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs font-semibold text-purple-600">
                <Crown className="w-3 h-3" />
                Pro only
              </span>
            )}
          </div>
          <CardDescription>
            {isPro
              ? "Add a logo and tagline — they appear as a banner at the top of your customer storefront."
              : "Add a custom logo and tagline to your storefront. Available on the Pro plan."}
          </CardDescription>
        </CardHeader>
        {isPro ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store Logo</Label>
              <div className="flex items-center gap-4">
                {bannerImageUrl ? (
                  <div className="relative group">
                    <img
                      src={imgSrc(bannerImageUrl)}
                      alt="Store logo"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                    />
                    <button
                      onClick={() => setBannerImageUrl(null)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />{bannerImageUrl ? "Replace Logo" : "Upload Logo"}</>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500">JPG, PNG, WebP · max 5 MB</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoSelected}
              />
            </div>

            <div className="space-y-2">
              <Label>Tagline <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                value={tagline}
                onChange={e => setTagline(e.target.value.slice(0, 100))}
                placeholder="e.g. Importer & Wholesaler of Fashion Jewellery"
                maxLength={100}
              />
              <p className="text-xs text-slate-500">{tagline.length}/100 characters</p>
            </div>

            <Button onClick={handleSaveBranding} disabled={updateSeller.isPending || uploadingLogo}>
              <Save className="w-4 h-4 mr-2" />
              Save Branding
            </Button>
          </CardContent>
        ) : (
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-purple-100 bg-purple-50/40 p-6 text-center">
              <Lock className="w-8 h-8 text-purple-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">Custom branding is a Pro feature</p>
              <p className="text-xs text-slate-500 mb-4">Upgrade to Pro to add your logo and tagline to your storefront.</p>
              <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                Upgrade to Pro — ₹299/mo
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Export Store Data ── */}
      <Card className={!isPro ? "opacity-90" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Store Data</CardTitle>
            {!isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs font-semibold text-purple-600">
                <Crown className="w-3 h-3" />
                Pro only
              </span>
            )}
          </div>
          <CardDescription>
            Download a JSON backup of your product catalogue and order history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Preparing export…</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Download Store Data (JSON)</>
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  Includes products, categories, variants, and full order history. Product photos are stored as image links — the actual image files are not bundled in this download. Your photos are backed up automatically every night alongside your database.
                </p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-1">Import from JSON</p>
                <p className="text-xs text-slate-500 mb-3">
                  Upload a Chatcart JSON export to import products. Duplicates (by name or SKU) are skipped.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <Button
                    variant="outline"
                    onClick={() => importInputRef.current?.click()}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Import JSON File</>
                    )}
                  </Button>
                  {importResult && (
                    <p className="text-xs text-slate-600">
                      ✓ {importResult.imported} imported
                      {importResult.skipped > 0 ? `, ${importResult.skipped} skipped (duplicates)` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-purple-100 bg-purple-50/40 p-6 text-center">
              <Lock className="w-8 h-8 text-purple-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">Data export is a Pro feature</p>
              <p className="text-xs text-slate-500 mb-4">Upgrade to Pro to download your product catalogue and full order history as a JSON file.</p>
              <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                Upgrade to Pro — ₹299/mo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Categories ── */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Organize your products into categories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={!newCatName || createCategory.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {categories?.map(category => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                {editingId === category.id ? (
                  <div className="flex flex-col gap-2 flex-1 mr-4">
                    <Input
                      value={editCatName}
                      onChange={e => setEditCatName(e.target.value)}
                      placeholder="Category name"
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 -mb-1">
                      Bulk discount — set a minimum quantity and discount % (leave both blank for no discount)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={editBulkMinQty}
                        onChange={e => setEditBulkMinQty(e.target.value)}
                        placeholder="Min qty (e.g. 6)"
                        className="w-36"
                      />
                      <span className="text-xs text-slate-400 shrink-0">units triggers</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editBulkPercent}
                        onChange={e => setEditBulkPercent(e.target.value)}
                        placeholder="Discount % (e.g. 10)"
                        className="w-40"
                      />
                      <span className="text-xs text-slate-400 shrink-0">% off</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateCategory(category.id)}>
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-slate-900">{category.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-500">{category.productCount} products</p>
                        {(category as any).dozenDiscountPercent != null && (category as any).dozenDiscountPercent > 0 && (category as any).bulkDiscountMinQty != null && (
                          <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                            {(category as any).dozenDiscountPercent}% off {(category as any).bulkDiscountMinQty}+
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditingId(category.id);
                        setEditCatName(category.name);
                        setEditBulkPercent(
                          (category as any).dozenDiscountPercent != null
                            ? String((category as any).dozenDiscountPercent)
                            : ""
                        );
                        setEditBulkMinQty(
                          (category as any).bulkDiscountMinQty != null
                            ? String((category as any).bulkDiscountMinQty)
                            : ""
                        );
                      }}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
