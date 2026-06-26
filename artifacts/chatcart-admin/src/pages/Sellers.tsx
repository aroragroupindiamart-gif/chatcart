import React, { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useSellers } from '@/hooks/useAdminApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Phone, Store, Clock, MessageCircle, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnrollInSequenceModal } from '@/components/EnrollInSequenceModal';

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

  // Bulk select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<number[]>([]);

  const allIds = sellers?.map(s => s.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEnrollSingle = (sellerId: string) => {
    setEnrollTarget([parseInt(sellerId)]);
    setEnrollModalOpen(true);
  };

  const openEnrollBulk = () => {
    setEnrollTarget([...selected].map(id => parseInt(id)));
    setEnrollModalOpen(true);
  };

  const enrollLabel = enrollTarget.length === 1
    ? (sellers?.find(s => s.id === String(enrollTarget[0]))?.storeName ?? 'this seller')
    : `${enrollTarget.length} selected sellers`;

  return (
    <Layout>
      <div className="space-y-6 pb-24">
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
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                        title="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Store</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    ))
                  ) : sellers?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        <Store className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        No sellers found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    sellers?.map((seller) => (
                      <tr
                        key={seller.id}
                        className={`hover:bg-muted/30 transition-colors group ${selected.has(seller.id) ? 'bg-primary/5' : seller.subscriptionPlan === 'pending' ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(seller.id)}
                            onChange={() => toggleOne(seller.id)}
                            className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEnrollSingle(seller.id)}
                            title="Enroll in WA Sequence"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-green-100 hover:text-green-700 text-muted-foreground"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
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

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border shadow-lg rounded-full px-5 py-3">
          <span className="text-sm font-medium text-foreground">
            {selected.size} seller{selected.size !== 1 ? 's' : ''} selected
          </span>
          <Button size="sm" className="gap-1.5 rounded-full" onClick={openEnrollBulk}>
            <MessageCircle className="w-3.5 h-3.5" />
            Enroll in WA Sequence
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <EnrollInSequenceModal
        open={enrollModalOpen}
        onClose={() => { setEnrollModalOpen(false); setSelected(new Set()); }}
        sellerIds={enrollTarget}
        sellerLabel={enrollTarget.length === 1 ? `Enrolling: ${enrollLabel}` : `Enrolling ${enrollLabel}`}
      />
    </Layout>
  );
}
