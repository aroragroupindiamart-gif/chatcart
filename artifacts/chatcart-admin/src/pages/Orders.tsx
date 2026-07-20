import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useOrders } from '@/hooks/useAdminApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';

export default function Orders() {
  const [status, setStatus] = useState<string>('all');
  const [, setLocation] = useLocation();
  
  const { data: orders, isLoading } = useOrders({
    status: status !== 'all' ? status : undefined,
    limit: 100
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders Feed</h1>
          <p className="text-muted-foreground text-sm">Platform-wide order activity.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
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
                    <th className="px-4 py-3 font-medium">Time</th>
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
                  ) : orders?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    orders?.map((item) => (
                      <tr
                        key={item.order.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/orders/${item.order.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {item.order.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.storeName}</div>
                          <div className="text-xs text-muted-foreground">{item.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.order.customerName || 'Guest'}</div>
                          <div className="text-xs text-muted-foreground">{item.order.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3">
                          ₹{(item.order.total ?? 0).toFixed(2)} <span className="text-xs text-muted-foreground">({item.order.itemsCount ?? 0} items)</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">{item.order.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(item.order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
