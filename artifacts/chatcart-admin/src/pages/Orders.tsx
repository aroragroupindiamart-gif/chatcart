import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useOrders, useSellers, GlobalOrder } from '@/hooks/useAdminApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Download, Calendar, Search, X, Store, IndianRupee, TrendingUp, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Orders() {
  const [sellerId, setSellerId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);
  const [, setLocation] = useLocation();

  // Load sellers list for the store dropdown
  const { data: sellers } = useSellers();

  // Calculate actual query from & to date strings based on preset
  const { queryFrom, queryTo } = useMemo(() => {
    const now = new Date();
    if (datePreset === 'today') {
      const todayStr = formatLocalDate(now);
      return {
        queryFrom: `${todayStr}T00:00:00.000`,
        queryTo: `${todayStr}T23:59:59.999`,
      };
    }
    if (datePreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatLocalDate(yest);
      return {
        queryFrom: `${yestStr}T00:00:00.000`,
        queryTo: `${yestStr}T23:59:59.999`,
      };
    }
    if (datePreset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      const startStr = formatLocalDate(d);
      const endStr = formatLocalDate(now);
      return {
        queryFrom: `${startStr}T00:00:00.000`,
        queryTo: `${endStr}T23:59:59.999`,
      };
    }
    if (datePreset === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      const startStr = formatLocalDate(d);
      const endStr = formatLocalDate(now);
      return {
        queryFrom: `${startStr}T00:00:00.000`,
        queryTo: `${endStr}T23:59:59.999`,
      };
    }
    if (datePreset === 'custom') {
      return {
        queryFrom: customFrom ? `${customFrom}T00:00:00.000` : undefined,
        queryTo: customTo ? `${customTo}T23:59:59.999` : undefined,
      };
    }
    return { queryFrom: undefined, queryTo: undefined };
  }, [datePreset, customFrom, customTo]);

  const { data: orders, isLoading } = useOrders({
    sellerId: sellerId !== 'all' ? sellerId : undefined,
    status: status !== 'all' ? status : undefined,
    from: queryFrom,
    to: queryTo,
    limit,
  });

  // Client-side text filter by Order ID, customer contact, or store name
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((item) => {
      const orderId = (item.order.id || '').toLowerCase();
      const customer = (item.order.customerName || '').toLowerCase();
      const phone = (item.order.customerPhone || '').toLowerCase();
      const store = (item.storeName || '').toLowerCase();
      return orderId.includes(term) || customer.includes(term) || phone.includes(term) || store.includes(term);
    });
  }, [orders, searchTerm]);

  // Compute key summary statistics
  const { totalRevenue, totalItems, avgOrderValue } = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return { totalRevenue: 0, totalItems: 0, avgOrderValue: 0 };
    }
    const rev = filteredOrders.reduce((sum, item) => sum + (item.order.total || 0), 0);
    const items = filteredOrders.reduce((sum, item) => sum + (item.order.itemsCount || 0), 0);
    const avg = rev / filteredOrders.length;
    return { totalRevenue: rev, totalItems: items, avgOrderValue: avg };
  }, [filteredOrders]);

  // Selected store details (if filtered by seller)
  const selectedSeller = useMemo(() => {
    if (sellerId === 'all' || !sellers) return null;
    return sellers.find((s) => String(s.id) === sellerId);
  }, [sellerId, sellers]);

  // Client-side CSV export trigger
  const handleExportCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert('No orders available to download for the selected filter.');
      return;
    }

    const header = [
      'Order ID',
      'Store Name',
      'Store Phone',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Total Amount (INR)',
      'Status',
      'Order Date & Time',
    ];

    const rows = filteredOrders.map((item) => [
      item.order.id,
      item.storeName || 'Unnamed Store',
      item.phone || '',
      item.order.customerName || 'Guest',
      item.order.customerPhone || '-',
      String(item.order.itemsCount ?? 0),
      (item.order.total ?? 0).toFixed(2),
      item.order.status,
      new Date(item.order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ]);

    const csvContent = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const sellerNameSlug = selectedSeller ? selectedSeller.storeName.replace(/\s+/g, '-').toLowerCase() : 'all-stores';
    const dateSlug = datePreset !== 'all' ? datePreset : 'all-time';
    link.href = url;
    link.download = `orders-${sellerNameSlug}-${dateSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSellerId('all');
    setStatus('all');
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = sellerId !== 'all' || status !== 'all' || datePreset !== 'all' || searchTerm.trim() !== '';

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Top Header & Export Action ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders Feed</h1>
            <p className="text-muted-foreground text-sm">
              Platform-wide order activity with seller & date range analytics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            )}

            <Button
              onClick={handleExportCSV}
              disabled={isLoading || filteredOrders.length === 0}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV ({filteredOrders.length})</span>
            </Button>
          </div>
        </div>

        {/* ── Metrics Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card shadow-sm border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Filtered Orders</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{isLoading ? '...' : filteredOrders.length}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedSeller ? selectedSeller.storeName : 'All Stores Combined'}
                </p>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Gross Value</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                  {isLoading ? '...' : `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Across {totalItems} total items sold
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <IndianRupee className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Average Order Value</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {isLoading ? '...' : `₹${avgOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Per order average
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters Bar ── */}
        <div className="bg-card border rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Seller Wise Selector */}
            <div className="w-full sm:w-[240px]">
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="w-full bg-background">
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Filter by Store" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All Stores / Sellers</SelectItem>
                  {sellers?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.storeName} ({s.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Date Range Presets */}
            <div className="w-full sm:w-[170px]">
              <Select value={datePreset} onValueChange={(val) => setDatePreset(val as DatePreset)}>
                <SelectTrigger className="w-full bg-background">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Date Range" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Status Filter */}
            <div className="w-full sm:w-[150px]">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Page Size Limit */}
            <div className="w-full sm:w-[130px]">
              <Select value={String(limit)} onValueChange={(val) => setLimit(Number(val))}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 orders</SelectItem>
                  <SelectItem value="50">50 orders</SelectItem>
                  <SelectItem value="100">100 orders</SelectItem>
                  <SelectItem value="250">250 orders</SelectItem>
                  <SelectItem value="500">500 orders</SelectItem>
                  <SelectItem value="1000">1000 orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Search Bar */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search Order ID, Customer, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-background h-9 text-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Custom Date Pickers (Shown when 'custom' is active) ── */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Custom Range:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-36 text-xs bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-36 text-xs bg-background"
                />
              </div>
              {(customFrom || customTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomFrom('');
                    setCustomTo('');
                  }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Dates
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Orders Table ── */}
        <Card className="shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Store</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Time (IST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      </tr>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-foreground">No orders match this criteria.</p>
                        <p className="text-xs mt-1">Try broadening your store, status, or date range filter.</p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-3 text-xs">
                            Clear Filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((item) => (
                      <tr
                        key={item.order.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/orders/${item.order.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {item.order.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.storeName}</div>
                          <div className="text-xs text-muted-foreground">{item.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.order.customerName || 'Guest'}</div>
                          <div className="text-xs text-muted-foreground">{item.order.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">₹{(item.order.total ?? 0).toFixed(2)}</span>{' '}
                          <span className="text-xs text-muted-foreground">({item.order.itemsCount ?? 0} items)</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`capitalize ${
                              item.order.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.order.status === 'confirmed' || item.order.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(item.order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Table Footer ── */}
        {!isLoading && filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground px-2">
            <div>
              Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> orders
              {selectedSeller && (
                <span> for <strong className="text-foreground">{selectedSeller.storeName}</strong></span>
              )}
            </div>
            <div>
              Click any order row to inspect full item breakdown and customer details.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
