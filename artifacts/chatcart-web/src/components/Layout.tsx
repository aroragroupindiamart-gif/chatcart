import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { removeToken } from "@/lib/auth";
import { LtdBanner } from "@/components/LtdBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Store,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: seller } = useGetMe();
  const logout = useLogout();

  const daysLeft = seller?.subscriptionPlan !== "lifetime" && seller?.subscriptionPlan !== "pending"
    ? (() => {
        if (!seller?.subscriptionEndDate) return null;
        const endDate = new Date(seller.subscriptionEndDate);
        const diffTime = endDate.getTime() - Date.now();
        if (diffTime <= 0) return 0;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      })()
    : null;

  const [showWarning, setShowWarning] = useState(() => {
    return sessionStorage.getItem("dismissed_expiry_warning") !== "true";
  });

  const handleDismissWarning = () => {
    setShowWarning(false);
    sessionStorage.setItem("dismissed_expiry_warning", "true");
  };

  const handleLogout = () => {
    if (!window.confirm("Log out of your store dashboard?")) return;
    logout.mutate(undefined, {
      onSuccess: () => {
        removeToken();
        setLocation("/login");
      },
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Products", href: "/products", icon: Package },
    { label: "Orders", href: "/orders", icon: ShoppingCart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col fixed inset-y-0 left-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-slate-900">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
            {seller?.storeName || "Chatcart"}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium text-slate-900 truncate">
              {seller?.phone}
            </p>
            <p className="text-xs text-slate-500 truncate">
              chatcart.in/store/{seller?.subdomain}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 h-14 bg-white border-b border-slate-200 flex items-center px-4">
        <div className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-900">
          <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
            <Store className="w-4 h-4" />
          </div>
          {seller?.storeName || "Chatcart"}
        </div>
        <button
          className="ml-auto p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={handleLogout}
          disabled={logout.isPending}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <LtdBanner />
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* PWA install prompt (Android & iOS) */}
      <InstallPrompt />

      {daysLeft !== null && daysLeft > 0 && daysLeft <= 3 && showWarning && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) handleDismissWarning(); }}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <DialogTitle className="text-center text-lg font-bold text-slate-900">
                Subscription Renewal Notice
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 text-sm leading-relaxed">
                Your subscription expires in <span className="font-semibold text-slate-900">{daysLeft} day{daysLeft > 1 ? 's' : ''}</span>. 
                Renew now to keep your store active and avoid interruption to your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <a
                href={`https://wa.me/919319724678?text=${encodeURIComponent(
                  `Hi, I'd like to renew my Chatcart subscription — my store is ${seller?.storeName || 'My Store'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-[#25D366] hover:bg-[#22c55e] text-white gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Renew Now
                </Button>
              </a>
              <Button
                variant="ghost"
                className="w-full text-slate-500 hover:text-slate-700"
                onClick={handleDismissWarning}
              >
                Dismiss
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
