import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuditLogs } from '@/hooks/useAdminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { Link } from 'wouter';

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const { data: logs, isLoading } = useAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    limit: 100
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Security and action trail for all admin operations.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="update_subscription">Update Subscription</SelectItem>
              <SelectItem value="suspend_seller">Suspend Seller</SelectItem>
              <SelectItem value="reactivate_seller">Reactivate Seller</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      </tr>
                    ))
                  ) : logs?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    logs?.map((item) => (
                      <tr key={item.log.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(item.log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.adminEmail}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.log.action}</code>
                        </td>
                        <td className="px-4 py-3">
                          {item.log.targetSellerId ? (
                            <Link href={`/sellers/${item.log.targetSellerId}`} className="text-primary hover:underline font-mono text-xs">
                              seller_{item.log.targetSellerId.substring(0, 6)}...
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {item.log.ipAddress}
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
