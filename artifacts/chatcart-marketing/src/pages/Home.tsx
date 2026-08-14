import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, MessageSquare, Search, ArrowRight, Share2, X, Zap, Clock, Flame, ShieldCheck, SlidersHorizontal, Upload, ChevronDown, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const LTD_WA_LINK =
  "https://wa.me/919319724678?text=Hi%2C%20I%27d%20like%20to%20claim%20the%20Chatcart%20Lifetime%20Deal%20at%20%E2%82%B99%2C999";

function calcUrgencyTimer() {
  const cycleMs = 2 * 3600 * 1000;
  const remainingMs = cycleMs - (Date.now() % cycleMs);

  const hours = Math.floor(remainingMs / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return {
    h: String(hours).padStart(2, "0"),
    m: String(minutes).padStart(2, "0"),
    s: String(seconds).padStart(2, "0"),
  };
}

const comparisonRows = [
  {
    feature: "Products disappearing when marked sold out",
    whatsapp: "Happens randomly (background sync bugs)",
    chatcart: "Never — archived, never deleted",
  },
  {
    feature: "Search your own catalog",
    whatsapp: "Not available",
    chatcart: "Full search by name",
  },
  {
    feature: "Filter by category or status",
    whatsapp: "Not available",
    chatcart: "Yes",
  },
  {
    feature: "Assign category when adding a product",
    whatsapp: "Upload first, edit separately later",
    chatcart: "Assign category right away",
  },
  {
    feature: "New products sort order",
    whatsapp: "Often buried / randomised",
    chatcart: "Newest-first, or sort manually",
  },
  {
    feature: "Manual reorder of products",
    whatsapp: "Not available",
    chatcart: "Drag-and-drop reorder",
  },
  {
    feature: "Size / color / custom variants",
    whatsapp: "Not available",
    chatcart: "Yes",
  },
  {
    feature: "Your own branding (logo + tagline)",
    whatsapp: "Not available",
    chatcart: "Yes (Pro plan)",
  },
  {
    feature: "Bulk import existing catalog",
    whatsapp: "Not available",
    chatcart: "Yes (Pro plan)",
  },
  {
    feature: "Product approval time",
    whatsapp: "15–30 min review delay before going live",
    chatcart: "Instant — live the moment you publish",
  },
];

export default function Home() {
  const [ltdStatus, setLtdStatus] = useState<{ remaining: number; capReached: boolean }>({
    remaining: 3,
    capReached: false,
  });
  const [timer, setTimer] = useState(calcUrgencyTimer);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/public/ltd-status")
      .then((r) => r.json())
      .then((d) => setLtdStatus({ remaining: 3, capReached: false }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimer(calcUrgencyTimer()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const scrollIfHash = () => {
      if (window.location.hash === "#pricing") {
        const el = document.getElementById("pricing");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    };
    const timer = setTimeout(scrollIfHash, 50);
    window.addEventListener("hashchange", scrollIfHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollIfHash);
    };
  }, []);

  const faqs = [
    {
      q: "What happens after the Lifetime Deal period ends?",
      a: "The Lifetime Deal is a permanent one-time payment. Once purchased, you get lifetime access to Chatcart Pro with no recurring monthly or annual fees ever.",
    },
    {
      q: "Can I migrate my existing WhatsApp catalog to Chatcart?",
      a: "Yes! You can add products individually in seconds or use our CSV bulk import feature to upload your entire product catalog instantly.",
    },
    {
      q: "Do you take a cut of my sales?",
      a: "No, never. Chatcart operates on a flat pricing model. We take 0% commission on your sales — 100% of your earnings stay with you.",
    },
    {
      q: "What support do I get?",
      a: "Starter and Growth plans include email support within 6-24 hours. Pro and Lifetime Deal members get 24/7 priority WhatsApp & direct phone support.",
    },
    {
      q: "Is there a contract or lock-in?",
      a: "There are no contracts or lock-ins. Monthly subscriptions can be canceled anytime, and the Lifetime Deal is a true single one-time payment.",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.15] text-balance">
                The catalog <br className="hidden sm:block"/>
                <span className="text-primary">that never lets you down.</span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                No random product disappearances. Powerful search. Sort exactly how you want. Built by sellers, for sellers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" asChild className="h-14 px-8 text-lg font-semibold w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                  <a href="/app/">Create Your Catalog</a>
                </Button>
                <p className="text-sm text-muted-foreground sm:ml-2">Takes 2 minutes. No credit card required.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Differentiators (Visual Rhythm: Light Tint Background + Distinct Icons) ── */}
      <section className="py-20 md:py-24 bg-[#F6FAF7] border-y border-emerald-100/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Fixing what's broken with WhatsApp Business.
            </h2>
            <p className="text-lg text-muted-foreground">
              We built Chatcart because we were tired of losing orders to bugs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card rounded-2xl p-8 border border-border/80 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-xs text-primary">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Products stay put.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ever had your best-selling items silently vanish from your WhatsApp catalog right before a big season? Never again.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-card rounded-2xl p-8 border border-border/80 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-xs text-primary">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Find anything instantly.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stop making your customers scroll through 500 items. A fast, reliable search means they find what they want, and you get the order.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-card rounded-2xl p-8 border border-border/80 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-xs text-primary">
                <SlidersHorizontal className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Your rules, your order.</h3>
              <p className="text-muted-foreground leading-relaxed">
                WhatsApp sorts your products randomly. We let you categorize and sort exactly how you need to sell.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Comparison Table (Visual Rhythm: Clean White Background) ── */}
      <section className="py-20 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Chatcart vs WhatsApp Catalog
            </h2>
            <p className="text-lg text-muted-foreground">
              Side by side, the difference is clear.
            </p>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden max-w-lg mx-auto space-y-3">
            {comparisonRows.map((row, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="px-4 py-3 bg-muted/20 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{row.feature}</p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-3 py-3 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">WhatsApp</span>
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-[11px] text-muted-foreground leading-snug text-center">{row.whatsapp}</span>
                  </div>
                  <div className="px-3 py-3 flex flex-col items-center gap-1.5 bg-primary/5">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Chatcart ✓</span>
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[11px] text-foreground font-medium leading-snug text-center">{row.chatcart}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block max-w-4xl mx-auto overflow-x-auto rounded-xl border border-border shadow-sm">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-5 text-sm font-semibold text-foreground w-1/2 bg-muted/20"></th>
                  <th className="py-4 px-4 text-sm font-semibold text-muted-foreground text-center w-1/4 bg-muted/20">
                    <span className="text-base">WhatsApp Catalog</span>
                  </th>
                  <th className="py-4 px-4 text-sm font-semibold text-center w-1/4 bg-primary/8 border-l-2 border-primary/30">
                    <span className="text-base font-bold text-primary">Chatcart ✓</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border/60 last:border-0 ${i % 2 === 0 ? "bg-muted/10" : "bg-background"}`}>
                    <td className="py-4 px-5 text-sm text-foreground font-medium leading-snug">{row.feature}</td>
                    <td className="py-4 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs text-muted-foreground leading-snug">{row.whatsapp}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center align-middle bg-primary/5 border-l-2 border-primary/20">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-foreground font-medium leading-snug">{row.chatcart}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 4: How it Works (Visual Rhythm: Soft Tint & Consistent Icon System) ── */}
      <section className="py-20 md:py-24 bg-[#F6FAF7] border-y border-emerald-100/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple. Direct. Frictionless.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
              <div className="hidden md:block absolute top-12 left-24 right-24 h-0.5 bg-primary/20 -z-10"></div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-20 h-20 bg-card border-2 border-primary/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm z-10 text-primary">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">1. Add your products</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Upload photos, set prices. Quick and easy.</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-20 h-20 bg-card border-2 border-primary/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm z-10 text-primary">
                  <Share2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">2. Share your link</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Send your store link on WhatsApp or Instagram.</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-20 h-20 bg-primary text-white rounded-2xl flex items-center justify-center mb-6 shadow-md z-10">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">3. Get orders on WhatsApp</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Customers browse and send formatted orders directly to your WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Pricing ── */}
      <section id="pricing" className="py-20 md:py-24 bg-background scroll-m-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Simple, honest pricing.
            </h2>
            <p className="text-lg text-muted-foreground">
              No hidden fees. No transaction cuts. Just a flat monthly rate.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-10">
            <div className="flex items-center justify-center gap-3 bg-amber-50 border border-amber-200/80 rounded-xl px-5 py-3.5 shadow-xs">
              <Flame className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
              <div className="text-center font-medium">
                <span className="text-sm font-bold text-amber-900">Special Launch Offer</span>
                <span className="mx-2 text-amber-400">—</span>
                <span className="text-sm font-extrabold text-amber-700 tracking-wide font-mono bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-300/60 inline-block">
                  {timer.h}h {timer.m}m {timer.s}s left
                </span>
              </div>
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            {/* Starter Tier */}
            <Card className="bg-background border-border shadow-sm relative">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>For starting out.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-base text-muted-foreground line-through mr-1.5">₹199</span>
                  <span className="text-4xl font-bold text-foreground">₹99</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Up to 25 active products
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> WhatsApp ordering
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Search, sort &amp; never lose a product
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Email support (within 24 hours)
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild><a href="/app/">Get Started</a></Button>
              </CardFooter>
            </Card>

            {/* Growth Tier */}
            <Card className="bg-background border-border shadow-sm relative">
              <CardHeader>
                <CardTitle className="text-2xl">Growth</CardTitle>
                <CardDescription>For growing businesses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-base text-muted-foreground line-through mr-1.5">₹399</span>
                  <span className="text-4xl font-bold text-foreground">₹199</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Up to 100 active products
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Everything in Starter
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Size, color &amp; custom variants
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Email support (4-6 hour response)
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild><a href="/app/">Get Started</a></Button>
              </CardFooter>
            </Card>

            {/* Pro Tier */}
            <Card className="bg-background border-primary shadow-md relative scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>For serious sellers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-base text-muted-foreground line-through mr-1.5">₹599</span>
                  <span className="text-4xl font-bold text-foreground">₹299</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Unlimited products
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Everything in Growth
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Custom store branding (logo + tagline)
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Remove "Powered by Chatcart" branding
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Bulk CSV import
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Monthly store data export
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> WhatsApp + phone support, 24/7 instant response
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg" asChild><a href="/app/">Get Started</a></Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Section 6: LTD ── */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-y border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
                <Zap className="w-3.5 h-3.5" />
                Limited Lifetime Deal
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
                Pay once. Use forever.
              </h2>
              <p className="text-lg text-muted-foreground">
                Get full Pro-tier access — unlimited products, custom branding, bulk import, data export, priority support — for a single one-time payment. No renewals. No surprises.
              </p>
            </div>

            <div className="bg-card border-2 border-primary/30 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-primary/8 px-8 py-6 border-b border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">One-time payment</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-foreground">₹9,999</span>
                    <span className="text-muted-foreground line-through text-lg">₹19,999</span>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  {ltdStatus.capReached ? (
                    <div className="bg-muted rounded-xl px-5 py-3">
                      <p className="text-sm font-bold text-muted-foreground">Sold Out</p>
                      <p className="text-xs text-muted-foreground mt-0.5">All 100 lifetime spots claimed</p>
                    </div>
                  ) : (
                    <div className="bg-primary/10 rounded-xl px-5 py-3">
                      <p className="text-2xl font-extrabold text-primary">{ltdStatus.remaining} left</p>
                      <p className="text-xs text-muted-foreground mt-0.5">of 100 lifetime spots</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-6">
                <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                  {[
                    "Unlimited products",
                    "Custom store branding",
                    "Bulk CSV import",
                    "Monthly data export",
                    "Size, color & custom variants",
                    "Priority WhatsApp support",
                  ].map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {ltdStatus?.capReached ? (
                  <div className="w-full text-center py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">
                    Lifetime deal is sold out
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full min-h-14 h-auto py-3 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    asChild
                  >
                    <a href={LTD_WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 flex-wrap text-center leading-snug">
                      <MessageSquare className="w-5 h-5 shrink-0" />
                      <span>Claim Lifetime Deal on WhatsApp</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: FAQ (Task 5: Simple Expandable Accordion) ── */}
      <section className="py-20 md:py-24 bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              Frequently Asked Questions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Everything you need to know.
            </h2>
            <p className="text-lg text-muted-foreground">
              Have questions before getting started? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isOpen ? "border-primary/40 bg-card shadow-sm" : "border-border/80 bg-card/60 hover:border-border"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left font-semibold text-foreground text-base sm:text-lg flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    <div className={`p-1 rounded-full transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-muted-foreground text-sm sm:text-base leading-relaxed border-t border-border/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-24 md:py-32 bg-primary relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-primary-foreground mb-6">
              Ready to fix your catalog?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10">
              Join the sellers who stopped fighting bugs and started taking more orders.
            </p>
            <Button size="lg" variant="secondary" asChild className="h-14 px-8 text-lg font-bold bg-background text-primary hover:bg-background/90 shadow-lg">
              <a href="/app/">Create Your Catalog Now</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
