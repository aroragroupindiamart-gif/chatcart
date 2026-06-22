import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { removeToken } from "@/lib/auth";
import { LtdBanner } from "@/components/LtdBanner";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: seller } = useGetMe();
  const logout = useLogout();

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
    </div>
  );
}
