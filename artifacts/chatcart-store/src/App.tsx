import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { lazy, Suspense } from "react";

const StoreFront = lazy(() => import("@/pages/StoreFront"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const DEMO_SUBDOMAIN = "sharma-general";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <Switch>
        <Route path="/">
          <Redirect to={`/${DEMO_SUBDOMAIN}`} />
        </Route>
        <Route path="/orders/:orderId" component={OrderConfirmation} />
        <Route path="/:subdomain/p/:productId" component={ProductPage} />
        <Route path="/:subdomain" component={StoreFront} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </CartProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
