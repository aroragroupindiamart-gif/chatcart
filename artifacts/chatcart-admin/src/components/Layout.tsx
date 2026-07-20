import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/lib/adminAuth';
import { LayoutDashboard, Users, ShoppingCart, Activity, Mail, LogOut, Menu, MessageCircle, WifiOff, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';

const WA_DISCONNECT_WARN_MS = 5 * 60 * 1000;

function useWAHealthBanner() {
  const { data } = useQuery<{ status: string; wa: { status: string; disconnectedAt: string | null } }>({
    queryKey: ['healthz-wa'],
    queryFn: async () => {
      const res = await fetch('/api/healthz');
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!data?.wa) return false;
  const { status, disconnectedAt } = data.wa;
  if (status === 'connected') return false;
  if (!disconnectedAt) return false;
  const elapsed = Date.now() - new Date(disconnectedAt).getTime();
  return elapsed > WA_DISCONNECT_WARN_MS;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sellers', label: 'Sellers', icon: Users },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/audit-log', label: 'Audit Log', icon: Activity },
  { href: '/contact-submissions', label: 'Contact', icon: Mail },
  { href: '/wa-marketing', label: 'WA Marketing', icon: MessageCircle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAdminAuth();
  const [location] = useLocation();
  const showWABanner = useWAHealthBanner();

  const NavLinks = () => (
    <>
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            C
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">Chatcart Admin</span>
        </div>
        <nav className="space-y-1 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-sidebar-border text-sm">
        <div className="text-sidebar-foreground/70 mb-4 truncate px-2" title={admin?.email}>
          {admin?.email}
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-sidebar-foreground border-sidebar-border bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <NavLinks />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border flex items-center px-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0 border-r-sidebar-border flex flex-col">
            <NavLinks />
          </SheetContent>
        </Sheet>
        <div className="ml-4 font-semibold text-sidebar-foreground">Chatcart Admin</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-0 flex flex-col min-h-0 mt-16 md:mt-0">
        {showWABanner && (
          <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex items-center gap-3 text-sm text-amber-900">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium">WhatsApp has been disconnected for more than 5 minutes.</span>
            <Link href="/wa-marketing">
              <span className="underline cursor-pointer hover:text-amber-700">Go to WA Marketing →</span>
            </Link>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
