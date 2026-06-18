import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { useGetMe, useUpdateSeller, useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Edit2, Trash, X, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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

  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    if (seller) {
      setStoreName(seller.storeName || "");
      setWhatsappNumber(seller.whatsappNumber || "");
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
