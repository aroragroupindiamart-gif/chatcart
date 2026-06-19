import React from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/lib/adminAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sellers from "@/pages/Sellers";
import SellerDetail from "@/pages/SellerDetail";
import Orders from "@/pages/Orders";
import AuditLog from "@/pages/AuditLog";
import ContactSubmissions from "@/pages/ContactSubmissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      
      <Route path="/sellers">
        <ProtectedRoute><Sellers /></ProtectedRoute>
      </Route>
      
      <Route path="/sellers/:id">
        <ProtectedRoute><SellerDetail /></ProtectedRoute>
      </Route>
      
      <Route path="/orders">
        <ProtectedRoute><Orders /></ProtectedRoute>
      </Route>
      
      <Route path="/audit-log">
        <ProtectedRoute><AuditLog /></ProtectedRoute>
      </Route>

      <Route path="/contact-submissions">
        <ProtectedRoute><ContactSubmissions /></ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
