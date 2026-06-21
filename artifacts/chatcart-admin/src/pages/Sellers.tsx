import React, { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useSellers } from '@/hooks/useAdminApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Phone, Store, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pending') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100 gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  if (plan === 'lifetime') return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-100 gap-1">⭐ Lifetime</Badge>;
  if (plan === 'pro') return <Badge className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-100">Pro</Badge>;
  if (plan === 'growth') return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">Growth</Badge>;
  return <Badge variant="secondary" className="capitalize">{plan}</Badge>;
}

export default function Sellers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [plan, setPlan] = useState<string>('all');

  const { data: sellers, isLoading } = useSellers({
    q: q || undefined,
    status: status !== 'all' ? status : undefined,
    plan: plan !== 'all' ? plan : undefined,
  });

  const pendingCount = sellers?.filter(s => s.subscriptionPlan === 'pending').length ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sellers</h1>
            <p className="text-muted-foreground text-sm">Manage all seller accounts on the platform.</p>
          </div>
          {pendingCount > 0 && plan === 'all' && status === 'all' && !q && (
            <button
              onClick={() => setPlan('pending')}
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Clock className="w-4 h-4" />
              {pendingCount} awaiting activation
            </button>
          )}
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
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-[150px] bg-card">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
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
                      <tr
                        key={seller.id}
                        className={`hover:bg-muted/30 transition-colors group ${seller.subscriptionPlan === 'pending' ? 'bg-amber-50/40' : ''}`}
                      >
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
                        <td className="px-4 py-3">
                          <PlanBadge plan={seller.subscriptionPlan} />
                        </td>
                        <td className="px-4 py-3">
                          {seller.isSuspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge
                              variant={seller.subscriptionStatus === 'active' || seller.subscriptionStatus === 'trial' ? 'default' : 'secondary'}
                              className={seller.subscriptionStatus === 'active' ? 'bg-primary hover:bg-primary/90' : ''}
                            >
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
