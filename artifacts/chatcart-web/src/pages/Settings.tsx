import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import {
  useGetMe,
  useUpdateSeller,
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useRequestLogoUploadUrl,
  RequestLogoUploadUrlBodyContentType,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Edit2, Trash, X, Check, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function imgSrc(url: string): string {
  if (url.startsWith("/objects/")) {
    return `/api/public/img/${url.slice("/objects/".length)}`;
  }
  return url;
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
  const requestLogoUploadUrl = useRequestLogoUploadUrl();

  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seller) {
      setStoreName(seller.storeName || "");
      setWhatsappNumber(seller.whatsappNumber || "");
      setBannerImageUrl((seller as any).bannerImageUrl ?? null);
      setTagline((seller as any).tagline ?? "");
    }
  }, [seller]);

  const handleSaveStore = async () => {
    try {
      await updateSeller.mutateAsync({
        data: { storeName, whatsappNumber }
      });
      toast({ title: "Store settings updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      const { uploadURL, objectPath } = await requestLogoUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type as RequestLogoUploadUrlBodyContentType },
      });
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      setBannerImageUrl(objectPath);
      toast({ title: "Logo uploaded — click Save to apply" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const { data: categories } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");

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
    try {
      await updateCategory.mutateAsync({ categoryId: id, data: { name: editCatName } });
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
            <Input value={`${seller?.subdomain || 'your-store'}.chatcart.in`} disabled className="bg-slate-50" />
          </div>
          <Button onClick={handleSaveStore} disabled={updateSeller.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* ── Store Branding ── */}
      <Card>
        <CardHeader>
          <CardTitle>Store Branding</CardTitle>
          <CardDescription>
            Add a logo and tagline — they appear as a banner at the top of your customer storefront.
            Leave both blank to show no banner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo upload */}
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

          {/* Tagline */}
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
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <Input
                      value={editCatName}
                      onChange={e => setEditCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(category.id)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleUpdateCategory(category.id)}>
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-slate-900">{category.name}</p>
                      <p className="text-xs text-slate-500">{category.productCount} products</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditingId(category.id);
                        setEditCatName(category.name);
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
