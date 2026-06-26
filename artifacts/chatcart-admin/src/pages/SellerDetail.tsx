import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { Layout } from '@/components/Layout';
import { useSeller, useSellerProducts, useSellerOrders, useUpdateSubscription, useSuspendSeller, useReactivateSeller, useWALeadsBySeller } from '@/hooks/useAdminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Store, Package, ShoppingCart, Calendar, Phone, Globe, CreditCard, MessageCircle, CheckCircle2, PauseCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnrollInSequenceModal } from '@/components/EnrollInSequenceModal';
import { formatOffset } from '@/lib/waOffset';

function WALeadStatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
  if (status === 'paused_no_reply') return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100 gap-1 text-xs"><PauseCircle className="w-3 h-3" />Paused (no reply)</Badge>;
  if (status === 'completed') return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100 text-xs">Completed</Badge>;
  return <Badge variant="secondary" className="text-xs capitalize">{status}</Badge>;
}

export default function SellerDetail() {
  const [, params] = useRoute('/sellers/:id');
  const id = params?.id || '';
  const { toast } = useToast();

  const { data: seller, isLoading: sellerLoading } = useSeller(id);
  const { data: products, isLoading: productsLoading } = useSellerProducts(id);
  const { data: orders, isLoading: ordersLoading } = useSellerOrders(id);
  const { data: waLeads, isLoading: waLeadsLoading } = useWALeadsBySeller(id);

  const updateSub = useUpdateSubscription();
  const suspendSeller = useSuspendSeller();
  const reactivateSeller = useReactivateSeller();

  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isEditingSub, setIsEditingSub] = useState(false);

  React.useEffect(() => {
    if (seller && !isEditingSub) {
      setEditPlan(seller.subscriptionPlan);
      setEditStatus(seller.subscriptionStatus);
      setEditEndDate(seller.subscriptionEndDate ? new Date(seller.subscriptionEndDate).toISOString().split('T')[0] : '');
    }
  }, [seller, isEditingSub]);

  const handleSaveSubscription = async () => {
    try {
      await updateSub.mutateAsync({
        id,
        data: {
          plan: editPlan,
          status: editStatus,
          endDate: editEndDate ? new Date(editEndDate).toISOString() : null
        }
      });
      setIsEditingSub(false);
      toast({ title: 'Subscription updated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update', description: e.message });
    }
  };

  const handleSuspend = async () => {
    if (suspendReason.length < 5) return;
    try {
      await suspendSeller.mutateAsync({ id, reason: suspendReason });
      setSuspendDialogOpen(false);
      setSuspendReason('');
      toast({ title: 'Seller suspended' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to suspend', description: e.message });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateSeller.mutateAsync(id);
      toast({ title: 'Seller reactivated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to reactivate', description: e.message });
    }
  };

  if (sellerLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Seller not found.</div></Layout>;
  }

  const sellerId = parseInt(id);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{seller.storeName || 'Unnamed Store'}</h1>
              {seller.isSuspended ? (
                <Badge variant="destructive">Suspended</Badge>
              ) : (
                <Badge variant={seller.subscriptionStatus === 'active' ? 'default' : 'secondary'} className={seller.subscriptionStatus === 'active' ? 'bg-primary' : ''}>
                  {seller.subscriptionStatus}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Phone className="w-3.5 h-3.5" /> {seller.phone}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => setEnrollModalOpen(true)}
            >
              <MessageCircle className="w-4 h-4" />
              Enroll in WA Sequence
            </Button>

            {seller.isSuspended ? (
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={handleReactivate} disabled={reactivateSeller.isPending}>
                Reactivate Seller
              </Button>
            ) : (
              <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Suspend Seller</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suspend Seller Account</DialogTitle>
                    <DialogDescription>
                      This will immediately take their store offline and prevent login. Please provide a reason for the audit log.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Reason (Required, min 5 chars)</Label>
                      <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. Violation of terms" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSuspend} disabled={suspendReason.length < 5 || suspendSeller.isPending}>
                      Confirm Suspension
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {seller.isSuspended && seller.suspensionReason && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Account Suspended</h3>
              <p className="text-sm mt-1">{seller.suspensionReason}</p>
              {seller.suspendedAt && <p className="text-xs mt-1 opacity-80">Suspended on {new Date(seller.suspendedAt).toLocaleString()}</p>}
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products ({seller.productCount || 0})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({seller.orderCount || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Store Info */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" /> Store Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">ID</div>
                      <div className="font-mono text-sm">{seller.id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Joined</div>
                      <div>{new Date(seller.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Subdomain</div>
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        {seller.subdomain ? `${seller.subdomain}.chatcart.com` : 'Not set'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">WhatsApp Business</div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {seller.whatsappNumber || 'Not set'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Editor */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Subscription
                    </CardTitle>
                    {!isEditingSub && (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingSub(true)}>Edit</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingSub ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <Select value={editPlan} onValueChange={setEditPlan}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="growth">Growth</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="lifetime">Lifetime (LTD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setIsEditingSub(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleSaveSubscription} disabled={updateSub.isPending}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
                        <div className="font-medium capitalize text-lg">{seller.subscriptionPlan}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <div className="capitalize">{seller.subscriptionStatus}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Period</div>
                        <div className="text-sm">
                          {seller.subscriptionStartDate ? new Date(seller.subscriptionStartDate).toLocaleDateString() : 'N/A'}
                          {' → '}
                          {seller.subscriptionEndDate ? new Date(seller.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* WA Sequences Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  WhatsApp Sequences
                </CardTitle>
              </CardHeader>
              <CardContent>
                {waLeadsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !waLeads || waLeads.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 flex flex-col items-center gap-2">
                    <MessageCircle className="w-7 h-7 opacity-20" />
                    <p>Not enrolled in any WA sequence yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 mt-1"
                      onClick={() => setEnrollModalOpen(true)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enroll now
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {waLeads.map(lead => (
                      <div key={lead.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{lead.sequenceName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lead.currentHourOffset < 0 ? 'Not started' : formatOffset(lead.currentHourOffset)}</span>
                            {lead.lastSentAt && <span>Last sent {new Date(lead.lastSentAt).toLocaleDateString()}</span>}
                            <span>Enrolled {new Date(lead.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <WALeadStatusBadge status={lead.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Price</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productsLoading ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading products...</td></tr>
                      ) : products?.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No products added.</td></tr>
                      ) : (
                        products?.map(p => (
                          <tr key={p.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3">₹{p.price}</td>
                            <td className="px-4 py-3 capitalize">{p.status}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 font-medium">Order ID</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ordersLoading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading orders...</td></tr>
                      ) : orders?.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
                      ) : (
                        orders?.map(o => (
                          <tr key={o.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                            <td className="px-4 py-3">
                              {o.customerName && <div className="font-medium">{o.customerName}</div>}
                              <div className="text-muted-foreground">{o.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3">₹{o.total} <span className="text-xs text-muted-foreground">({o.itemsCount} items)</span></td>
                            <td className="px-4 py-3 capitalize">{o.status}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EnrollInSequenceModal
        open={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        sellerIds={[sellerId]}
        sellerLabel={`Enrolling: ${seller.storeName || seller.phone}`}
      />
    </Layout>
  );
}
