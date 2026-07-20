import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { Layout } from '@/components/Layout';
import { useSeller, useSellerProducts, useSellerOrders, useUpdateSubscription, useSuspendSeller, useReactivateSeller, useWALeadsBySeller, useRemoveFromWASequence, useSellerAnalytics } from '@/hooks/useAdminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Store, Package, ShoppingCart, Calendar, Phone, Globe, CreditCard, MessageCircle, CheckCircle2, PauseCircle, Clock, Trash2, TrendingUp, BarChart3, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnrollInSequenceModal } from '@/components/EnrollInSequenceModal';
import { formatOffset } from '@/lib/waOffset';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function WALeadStatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
  if (status === 'paused_no_reply') return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100 gap-1 text-xs"><PauseCircle className="w-3 h-3" />Paused (no reply)</Badge>;
  if (status === 'paused_manual') return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-100 text-xs">Paused</Badge>;
  if (status === 'completed') return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100 text-xs">Completed</Badge>;
  if (status === 'send_failed') return <Badge className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-100 text-xs">Send Failed</Badge>;
  if (status === 'removed') return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-100 text-xs">Removed</Badge>;
  return <Badge variant="secondary" className="text-xs capitalize">{status.replace(/_/g, ' ')}</Badge>;
}

export default function SellerDetail() {
  const [, params] = useRoute('/sellers/:id');
  const id = params?.id || '';
  const { toast } = useToast();

  const { data: seller, isLoading: sellerLoading } = useSeller(id);
  const { data: products, isLoading: productsLoading } = useSellerProducts(id);
  const { data: orders, isLoading: ordersLoading } = useSellerOrders(id);
  const { data: waLeads, isLoading: waLeadsLoading } = useWALeadsBySeller(id);
  const [analyticsRange, setAnalyticsRange] = useState('all');
  const { data: analytics, isLoading: analyticsLoading } = useSellerAnalytics(id, analyticsRange);

  const updateSub = useUpdateSubscription();
  const suspendSeller = useSuspendSeller();
  const reactivateSeller = useReactivateSeller();
  const removeFromSequence = useRemoveFromWASequence();

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
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                        <div className="flex items-center gap-2 shrink-0">
                          <WALeadStatusBadge status={lead.status} />
                          {lead.status !== 'completed' && lead.status !== 'removed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              title="Remove from sequence"
                              disabled={removeFromSequence.isPending}
                              onClick={() => removeFromSequence.mutate(lead.id, {
                                onSuccess: () => toast({ title: 'Removed from sequence' }),
                              })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
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

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium">Sales & Performance Analytics</h3>
                <p className="text-xs text-muted-foreground">Detailed metrics for this store.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Time Range:</span>
                <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
                  <SelectTrigger className="w-[150px] bg-card">
                    <SelectValue placeholder="Select Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">No analytics data available.</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        Total Revenue
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-extrabold text-primary">
                        ₹{analytics.summary.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Earnings across selected period</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        Total Orders
                        <ShoppingCart className="w-4 h-4 text-amber-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-extrabold">
                        {analytics.summary.totalOrders}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Orders placed in selected period</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Sales & Orders Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.trends.length === 0 ? (
                      <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                        No transactions recorded for this period.
                      </div>
                    ) : (
                      <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={analytics.trends}>
                            <defs>
                              <linearGradient id="sellerColorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            />
                            <YAxis 
                              yAxisId="left"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                              tickFormatter={(v) => `₹${v}`}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                              itemStyle={{ color: 'var(--foreground)' }}
                              formatter={(value, name) => {
                                if (name === 'revenue') return [`₹${Number(value).toFixed(2)}`, 'Revenue'];
                                return [value, 'Orders'];
                              }}
                            />
                            <Area 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="revenue" 
                              name="revenue" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#sellerColorRev)" 
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="orders" 
                              name="orders" 
                              stroke="hsl(var(--warning))" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Best Sellers and Categories Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Best Selling Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Best-Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                            <tr>
                              <th className="px-4 py-3 font-medium">Product</th>
                              <th className="px-4 py-3 font-medium text-right">Units Sold</th>
                              <th className="px-4 py-3 font-medium text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {analytics.bestSellers.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                  No items sold yet.
                                </td>
                              </tr>
                            ) : (
                              analytics.bestSellers.map((item, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  <td className="px-4 py-3 font-medium flex items-center gap-3">
                                    {item.image ? (
                                      <img 
                                        src={imgSrc(item.image)} 
                                        alt={item.name} 
                                        className="w-10 h-10 rounded object-cover border border-border"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
                                        <Package className="w-5 h-5 text-muted-foreground/40" />
                                      </div>
                                    )}
                                    <span className="truncate max-w-[180px]" title={item.name}>{item.name}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                                  <td className="px-4 py-3 text-right font-semibold">₹{item.revenue.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Category Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analytics.categoryPerformance.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No category data available.
                        </div>
                      ) : (
                        analytics.categoryPerformance.map((cat, idx) => {
                          const percentage = analytics.summary.totalRevenue > 0 
                            ? (cat.revenue / analytics.summary.totalRevenue) * 100 
                            : 0;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{cat.name}</span>
                                <span className="text-muted-foreground font-mono">
                                  ₹{cat.revenue.toFixed(2)} ({cat.quantity} sold)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ width: `${percentage}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
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
