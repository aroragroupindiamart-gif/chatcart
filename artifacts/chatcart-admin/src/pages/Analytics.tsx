import React, { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { usePlatformAnalytics } from '@/hooks/useAdminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ShoppingBag, Users, TrendingUp, ChevronRight, Package } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function imgSrc(url: string): string {
  return url.replace(/^\/objects\//, "/api/public/img/");
}

export default function Analytics() {
  const [range, setRange] = useState<string>('month');
  const { data: analytics, isLoading } = usePlatformAnalytics(range);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Failed to load analytics data.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
            <p className="text-muted-foreground text-sm">Performance metrics and intelligence across the entire Chatcart platform.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Time Range:</span>
            <Select value={range} onValueChange={setRange}>
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

        {/* Top-Level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platform Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-primary">
                ₹{analytics.summary.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total sales in selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingBag className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {analytics.summary.totalOrders.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Orders placed in selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registered Sellers</CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {analytics.summary.totalSellers.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total active & pending seller shops</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdowns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Historical Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-border">
              <div className="px-4 first:pl-0">
                <div className="text-xs text-muted-foreground">Last 7 Days</div>
                <div className="text-lg font-bold mt-1">₹{analytics.breakdowns.week.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="px-4">
                <div className="text-xs text-muted-foreground">Last 30 Days</div>
                <div className="text-lg font-bold mt-1">₹{analytics.breakdowns.month.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="px-4">
                <div className="text-xs text-muted-foreground">Last Year</div>
                <div className="text-lg font-bold mt-1">₹{analytics.breakdowns.year.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="px-4">
                <div className="text-xs text-muted-foreground">All-Time</div>
                <div className="text-lg font-bold mt-1">₹{analytics.breakdowns.all.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Platform Sales & Orders Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.trends.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No transactions recorded for this period.
              </div>
            ) : (
              <div className="h-[320px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.trends}>
                    <defs>
                      <linearGradient id="platformColorRev" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#platformColorRev)" 
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

        {/* Top Sellers and Top Products side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Sellers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Performing Sellers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Store</th>
                      <th className="px-4 py-3 font-medium text-right">Orders</th>
                      <th className="px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.topSellers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No active sellers recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      analytics.topSellers.map((s, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm">{s.storeName}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {s.subdomain ? `${s.subdomain}.chatcart.in` : s.phone}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{s.ordersCount}</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{s.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/sellers/${s.sellerId}`}>
                              <span className="inline-flex items-center text-xs text-primary hover:underline font-medium cursor-pointer">
                                Details
                                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Products Platform-Wide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Best-Selling Products (Platform-Wide)</CardTitle>
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
        </div>
      </div>
    </Layout>
  );
}
