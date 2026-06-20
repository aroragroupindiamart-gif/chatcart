import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, MessageSquare, Search, ArrowRight, Share2, X } from "lucide-react";
import { motion } from "framer-motion";

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
];

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-24 pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
                The catalog <br className="hidden md:block"/>
                <span className="text-primary">that never lets you down.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium">
                No random product disappearances. Powerful search. Sort exactly how you want. Built by sellers, for sellers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" asChild className="h-14 px-8 text-lg font-semibold w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                  <a href="/app/">Create Your Catalog</a>
                </Button>
                <p className="text-sm text-muted-foreground sm:ml-4">Takes 2 minutes. No credit card required.</p>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Subtle background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      </section>

      {/* Differentiators Section */}
      <section className="py-24 bg-card border-y border-border">
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-background rounded-2xl p-8 border border-border shadow-sm"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Products stay put.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ever had your best-selling items silently vanish from your WhatsApp catalog right before a big season? Never again.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-background rounded-2xl p-8 border border-border shadow-sm"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Find anything instantly.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stop making your customers scroll through 500 items. A fast, reliable search means they find what they want, and you get the order.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-background rounded-2xl p-8 border border-border shadow-sm"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Your rules, your order.</h3>
              <p className="text-muted-foreground leading-relaxed">
                WhatsApp sorts your products randomly. We let you categorize and sort exactly how you need to sell.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Chatcart vs WhatsApp Catalog
            </h2>
            <p className="text-lg text-muted-foreground">
              Side by side, the difference is clear.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-foreground w-1/2"></th>
                  <th className="py-4 px-4 text-sm font-semibold text-muted-foreground text-center w-1/4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">WhatsApp Catalog</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 text-sm font-semibold text-center w-1/4">
                    <div className="flex flex-col items-center gap-1 text-primary">
                      <span className="text-base font-bold">Chatcart</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                    <td className="py-3.5 px-4 text-sm text-foreground font-medium">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs text-muted-foreground">{row.whatsapp}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-foreground font-medium">{row.chatcart}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-card border-y border-border">
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
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-24 right-24 h-0.5 bg-border -z-10"></div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-24 h-24 bg-card border-2 border-border rounded-2xl flex items-center justify-center mb-6 shadow-sm z-10">
                  <span className="text-3xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Add your products</h3>
                <p className="text-sm text-muted-foreground">Upload photos, set prices. Quick and easy.</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-24 h-24 bg-card border-2 border-border rounded-2xl flex items-center justify-center mb-6 shadow-sm z-10">
                  <Share2 className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Share your link</h3>
                <p className="text-sm text-muted-foreground">Send your store link on WhatsApp or Instagram.</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3">
                <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-md z-10">
                  <MessageSquare className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Get orders on WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Customers browse and send perfectly formatted orders directly to your WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background scroll-m-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Simple, honest pricing.
            </h2>
            <p className="text-lg text-muted-foreground">
              No hidden fees. No transaction cuts. Just a flat monthly rate.
            </p>
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

            {/* Growth Tier — standard card, no badge */}
            <Card className="bg-background border-border shadow-sm relative">
              <CardHeader>
                <CardTitle className="text-2xl">Growth</CardTitle>
                <CardDescription>For growing businesses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
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

            {/* Pro Tier — highlighted as Most Popular */}
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

      {/* Bottom CTA */}
      <section className="py-32 bg-primary relative overflow-hidden">
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
