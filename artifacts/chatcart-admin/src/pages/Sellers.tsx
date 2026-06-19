import React, { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useSellers } from '@/hooks/useAdminApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Phone, Store } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Sellers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [plan, setPlan] = useState<string>('all');

  const { data: sellers, isLoading } = useSellers({
    q: q || undefined,
    status: status !== 'all' ? status : undefined,
    plan: plan !== 'all' ? plan : undefined,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sellers</h1>
          <p className="text-muted-foreground text-sm">Manage all seller accounts on the platform.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by store name or phone..."
              className="pl-8 bg-card"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px] bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-[150px] bg-card">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Store</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      </tr>
                    ))
                  ) : sellers?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        <Store className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        No sellers found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    sellers?.map((seller) => (
                      <tr key={seller.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <Link href={`/sellers/${seller.id}`} className="font-medium text-foreground hover:underline">
                            {seller.storeName || 'Unnamed Store'}
                          </Link>
                          {seller.subdomain && (
                            <div className="text-xs text-muted-foreground mt-0.5">{seller.subdomain}.chatcart.com</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {seller.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{seller.subscriptionPlan}</td>
                        <td className="px-4 py-3">
                          {seller.isSuspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge variant={seller.subscriptionStatus === 'active' || seller.subscriptionStatus === 'trial' ? 'default' : 'secondary'} className={seller.subscriptionStatus === 'active' ? 'bg-primary hover:bg-primary/90' : ''}>
                              {seller.subscriptionStatus}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(seller.createdAt).toLocaleDateString()}
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
