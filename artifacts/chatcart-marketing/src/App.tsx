import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Disclaimer from "@/pages/Disclaimer";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout><Home /></Layout>
      </Route>
      <Route path="/lp" component={LandingPage} />
      <Route path="/about">
        <Layout><About /></Layout>
      </Route>
      <Route path="/contact">
        <Layout><Contact /></Layout>
      </Route>
      <Route path="/terms">
        <Layout><Terms /></Layout>
      </Route>
      <Route path="/privacy">
        <Layout><Privacy /></Layout>
      </Route>
      <Route path="/disclaimer">
        <Layout><Disclaimer /></Layout>
      </Route>
      <Route>
        <Layout><NotFound /></Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
