import React from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { useHealth } from '@/hooks/useAdminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, ShoppingCart, AlertTriangle, TrendingUp, ArrowRight, Infinity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { data: health, isLoading } = useHealth();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Health</h1>
            <p className="text-muted-foreground text-sm">Overview of Chatcart's current status and metrics.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/sellers">
              <Button variant="outline" size="sm">
                View Sellers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                View Orders
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sellers</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health?.sellers.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sellers</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health?.sellers.active || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trial Sellers</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health?.sellers.trial || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health?.sellers.suspended || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lifetime Deal Counter */}
        {(() => {
          const claimed = health?.sellers.lifetimeCount ?? 0;
          const LTD_CAP = 100;
          const remaining = LTD_CAP - claimed;
          const pct = Math.round((claimed / LTD_CAP) * 100);
          const isFull = claimed >= LTD_CAP;
          return (
            <Card className={isFull ? 'border-red-300 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  Lifetime Deal (LTD) Spots
                </CardTitle>
                {isFull && <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">SOLD OUT</span>}
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`text-3xl font-bold ${isFull ? 'text-red-700' : 'text-yellow-900'}`}>{claimed}</span>
                  <span className="text-lg text-yellow-700 mb-0.5">/ {LTD_CAP}</span>
                  <span className="text-sm text-yellow-600 mb-1 ml-1">{isFull ? 'all sold' : `${remaining} remaining`}</span>
                </div>
                <div className="w-full bg-yellow-100 rounded-full h-2 border border-yellow-200">
                  <div
                    className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-yellow-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-yellow-700 mt-2">{pct}% claimed — manually remove offer from marketing page once full</p>
              </CardContent>
            </Card>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Signup Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={health?.signupTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      dy={10}
                      tickFormatter={(val) => {
                        const date = new Date(val);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Volume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Today</p>
                <div className="text-2xl font-bold">{health?.orders.today || 0}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">This Week</p>
                <div className="text-2xl font-bold">{health?.orders.thisWeek || 0}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">This Month</p>
                <div className="text-2xl font-bold">{health?.orders.thisMonth || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
