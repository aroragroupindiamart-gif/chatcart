import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  X, 
  Search, 
  ArrowRight, 
  Zap, 
  Clock, 
  Flame, 
  Sparkles, 
  ShieldAlert,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  RotateCw
} from "lucide-react";

const LTD_WA_LINK =
  "https://wa.me/919319724678?text=Hi%2C%20I%27d%20like%20to%20claim%20the%20Chatcart%20Lifetime%20Deal%20at%20%E2%82%B99%2C999";

const trustedBrands = [
  { name: "SHARMA'S BOUTIQUE", type: "Ethnic Wear" },
  { name: "KAPOOR TEXTILES", type: "Wholesale Fabric" },
  { name: "THE SAREE CO.", type: "D2C Fashion" },
  { name: "KOREAN BLING", type: "Accessories" },
  { name: "GIFTIFY INDIA", type: "Custom Gifts" }
];

export default function LandingPage() {
  const [step, setStep] = useState(1);
  const [step1Answer, setStep1Answer] = useState("");
  const [step2Answer, setStep2Answer] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Simple mock dynamic states for mechanism demo
  const [demoSearch, setDemoSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [demoCart, setDemoCart] = useState<Array<{ name: string; price: number; qty: number }>>([]);

  const demoProducts = [
    { id: 1, name: "Anti-Tarnish Korean Earrings", category: "earrings", price: 399, img: "✨" },
    { id: 2, name: "Minimalist Silver Ring", category: "rings", price: 499, img: "💍" },
    { id: 3, name: "Korean Aesthetic Bracelet", category: "bracelets", price: 599, img: "📿" },
    { id: 4, name: "Premium Saree Drip Collar", category: "fashion", price: 1299, img: "👗" }
  ];

  const filteredDemoProducts = demoProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(demoSearch.toLowerCase());
    const matchesCat = activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleStep1Select = (val: string) => {
    setStep1Answer(val);
  };

  const handleStep2Select = (val: string) => {
    setStep2Answer(val);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone === "+91 ") return;
    setFormSubmitting(true);
    setTimeout(() => {
      setFormSubmitting(false);
      setFormSuccess(true);
      setTimeout(() => {
        window.location.href = "/app/";
      }, 2000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-[#1A191A] font-sans antialiased selection:bg-[#FFC629] selection:text-[#1A191A] pb-20">
      <style>{`
        @keyframes aura-pulse {
          0% {
            box-shadow: 0px 8px 0px 0px #1A191A, 0 0 0 0 rgba(255, 198, 41, 0.7);
          }
          70% {
            box-shadow: 0px 8px 0px 0px #1A191A, 0 0 0 15px rgba(255, 198, 41, 0);
          }
          100% {
            box-shadow: 0px 8px 0px 0px #1A191A, 0 0 0 0 rgba(255, 198, 41, 0);
          }
        }
        .pulse-aura {
          animation: aura-pulse 2s infinite;
        }
        .neo-border {
          border: 1px solid #1A191A;
        }
        .neo-shadow {
          box-shadow: 0px 8px 0px 0px #1A191A;
        }
        .neo-shadow-yellow {
          box-shadow: 0px 8px 0px 0px #FFC629;
        }
        .neo-btn {
          border: 1px solid #1A191A;
          transition: all 0.15s ease-in-out;
        }
        .neo-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 2px 2px 0px 0px #1A191A;
        }
        .neo-btn:active {
          transform: translate(0px, 0px);
          box-shadow: 0px 0px 0px 0px #1A191A;
        }
      `}</style>

      {/* 1. Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#1A191A]/10">
        <Link href="/" className="text-2xl font-black tracking-tight text-[#1A191A]">
          Chatcart
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-sm font-semibold hover:text-[#FFC629] transition-colors">Home</a>
          <a href="#features" className="text-sm font-semibold hover:text-[#FFC629] transition-colors">Features</a>
          <a href="#comparison" className="text-sm font-semibold hover:text-[#FFC629] transition-colors">Compare</a>
          <a href="#pricing" className="text-sm font-semibold hover:text-[#FFC629] transition-colors">Pricing</a>
        </nav>
        <div>
          <a 
            href="#pricing" 
            className="neo-btn rounded-[4px] px-5 py-2.5 text-sm font-bold bg-[#FFFFFF] hover:bg-[#FFFDF0]"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* 2. Hero Block */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FFC629] text-[#1A191A] text-[13px] font-black tracking-widest px-3 py-1 rounded-full uppercase mb-8 border border-[#1A191A]">
          <Sparkles className="w-3.5 h-3.5" />
          FOR HIGH-VOLUME WHATSAPP SELLERS
        </div>
        
        <h1 
          className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 max-w-5xl mx-auto leading-[1.05]"
          style={{ textWrap: "balance" }}
        >
          Stop Losing WhatsApp Orders to Buggy Catalog Glitches.
        </h1>
        
        <p 
          className="text-lg md:text-xl text-[#54595F] mb-12 max-w-3xl mx-auto leading-relaxed"
          style={{ textWrap: "balance" }}
        >
          Upgrade to <strong className="text-[#1A191A] font-extrabold">The Bulletproof Catalog Engine™</strong> in 2 minutes flat. Give your customers a lightning-fast search bar, custom categories, and automated checkouts that land perfectly formatted orders straight into your WhatsApp chat.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <a 
            href="#interactive-qualifier"
            className="pulse-aura rounded-[4px] px-8 py-5 text-lg md:text-xl font-bold bg-[#1A191A] text-[#FFFFFF] border border-[#1A191A] hover:bg-[#2A292A] transition-colors w-full max-w-lg inline-block"
          >
            Create Your Bug-Free WhatsApp Catalog Now →
          </a>
          <span className="text-xs text-[#54595F] font-semibold tracking-wide uppercase">
            Takes 2 minutes. No credit card required.
          </span>
        </div>
      </section>

      {/* 3. Trust Anchor */}
      <section className="w-full border-t border-[#1A191A]/10 py-12 bg-[#FFFFFF]/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] md:text-[11px] font-black tracking-widest text-[#54595F] uppercase mb-8">
            TRUSTED BY HIGH-VOLUME DIRECT-TO-CONSUMER AND WHOLESALE SELLERS RUNNING CHAT COMMERCE
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center justify-items-center opacity-70 filter grayscale">
            {trustedBrands.map((b, i) => (
              <div key={i} className="text-center font-black tracking-tighter text-sm md:text-base border border-[#1A191A]/20 px-4 py-2 bg-[#FFFFFF]">
                {b.name}
                <div className="text-[8px] font-semibold tracking-normal text-[#54595F] mt-0.5">{b.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. The Agitation Split Section */}
      <section className="bg-[#F3F4F6] border-y border-[#1A191A] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-tight"
              style={{ textWrap: "balance" }}
            >
              Two Sellers. Same Broadcast List. One is drowning in customer confusion. One is cleanly booking orders.
            </h2>
            <p className="text-md md:text-lg text-[#54595F] leading-relaxed">
              Both use WhatsApp to run their business. Both work 14-hour days to talk to customers. So why does one lose half their sales to manual back-and-forth messaging while the other takes automated, structured orders while they sleep? It’s not the product. It’s the catalog stability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* The Pain Card */}
            <div className="bg-[#FFFFFF] neo-border neo-shadow p-8 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#FFD9D9] text-[#A61C1C] text-[10px] font-black tracking-wider px-2 py-1 rounded-[4px] mb-6 border border-[#A61C1C]/30">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  THE MANUAL PAIN PATHWAY
                </div>
                <h3 className="text-xl font-bold mb-6">
                  The Seller relying entirely on the basic WhatsApp Business Catalog:
                </h3>
                <ul className="space-y-4">
                  {[
                    "Wakes up to find their best-selling items have randomly vanished from the app due to background sync bugs.",
                    "Forces buyers to scroll through a chaotic, randomly sorted wall of 500 items just to find one specific product.",
                    "Loses hot leads because Meta takes 30 minutes to 'approve' a simple price update before customers can see it."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                      <span className="text-sm text-[#54595F] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 pt-6 border-t border-[#1A191A]/10 text-xs text-[#54595F] font-semibold">
                Result: Drowned in "Is this available?" texts.
              </div>
            </div>

            {/* The Upgrade Card */}
            <div className="bg-[#FFFFFF] neo-border neo-shadow-yellow p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#FFC629] text-[#1A191A] font-bold text-[10px] px-3 py-1 uppercase border-b border-l border-[#1A191A] tracking-wider rounded-bl-[4px]">
                Highly Stable
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#FFFDF0] text-[#1A191A] text-[10px] font-black tracking-wider px-2 py-1 rounded-[4px] mb-6 border border-[#FFC629]">
                  <Zap className="w-3.5 h-3.5 text-[#FFC629] fill-[#FFC629]" />
                  THE CHATCART ENGINE
                </div>
                <h3 className="text-xl font-bold mb-6">
                  The Seller who upgraded their catalog with Chatcart:
                </h3>
                <ul className="space-y-4">
                  {[
                    "Rests easy knowing archived items stay put, and active products never disappear on their own.",
                    "Gives customers a powerful search bar so they filter by category, pick their size or color, and buy in under 10 seconds.",
                    "Updates pricing or imagery instantly—live the exact millisecond you hit publish."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                      <span className="text-sm text-[#1A191A] font-medium leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 pt-6 border-t border-[#1A191A]/10 text-xs text-[#1A191A] font-black uppercase">
                Result: Structured checkouts directly in chat.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Proprietary Mechanism Breakdown */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ textWrap: "balance" }}
          >
            Inside The Bulletproof Catalog Engine™
          </h2>
          <p className="text-md md:text-lg text-[#54595F]">
            We didn't build a complex website platform. We built a mature, upgraded interface designed explicitly for high-volume WhatsApp selling:
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between neo-shadow">
            <div>
              <div className="w-10 h-10 bg-[#FFFDF0] border border-[#1A191A] rounded-[4px] flex items-center justify-center mb-6 font-black">
                01
              </div>
              <h3 className="text-lg font-black mb-3">Instant-Publish Sync</h3>
              <p className="text-sm text-[#54595F] leading-relaxed">
                Bypass Meta's background sync delays and mandatory review times. When you edit a price or upload a product in your dashboard, it goes live on your catalog the exact millisecond you hit save.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1A191A]/10 flex items-center justify-between text-xs font-semibold text-[#1A191A]">
              <span>Latency</span>
              <span className="font-mono bg-[#FFFDF0] px-2 py-0.5 rounded-[4px] border border-[#1A191A]/10">0.02 Seconds</span>
            </div>
          </div>

          {/* Feature 2 (Interactive Demo Card) */}
          <div className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between neo-shadow relative overflow-hidden">
            <div>
              <div className="w-10 h-10 bg-[#FFC629] border border-[#1A191A] rounded-[4px] flex items-center justify-center mb-6 font-black">
                02
              </div>
              <h3 className="text-lg font-black mb-3">Intent-Driven Search & Sorting</h3>
              <p className="text-sm text-[#54595F] leading-relaxed mb-4">
                Take control of how you sell. Drag-and-drop your best-sellers to the top, create clean custom categories, and let buyers find anything in one tap with real-time indexing.
              </p>
              
              {/* Interactive Micro Mockup */}
              <div className="border border-[#1A191A] rounded-[4px] p-3 bg-[#F3F4F6] text-xs font-sans mt-4">
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 w-3 h-3 text-[#54595F]" />
                    <input 
                      type="text" 
                      placeholder="Search items..." 
                      className="w-full bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] pl-6 pr-2 py-1 text-[11px] focus:outline-none"
                      value={demoSearch}
                      onChange={(e) => setDemoSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] text-[10px] px-1 py-1"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="earrings">Earrings</option>
                    <option value="rings">Rings</option>
                  </select>
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {filteredDemoProducts.map(p => (
                    <div key={p.id} className="bg-[#FFFFFF] border border-[#1A191A]/10 p-1.5 rounded-[4px] flex items-center justify-between text-[11px]">
                      <span className="font-semibold">{p.img} {p.name}</span>
                      <span>₹{p.price}</span>
                    </div>
                  ))}
                  {filteredDemoProducts.length === 0 && (
                    <div className="text-center py-2 text-[#54595F] text-[10px]">No matching products</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1A191A]/10 text-xs font-semibold text-[#FFC629] uppercase tracking-wider flex items-center justify-between">
              <span>Interactive Mockup</span>
              <span className="text-[#1A191A] text-[10px] normal-case font-normal">(Try searching/filtering)</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between neo-shadow">
            <div>
              <div className="w-10 h-10 bg-[#FFFDF0] border border-[#1A191A] rounded-[4px] flex items-center justify-center mb-6 font-black">
                03
              </div>
              <h3 className="text-lg font-black mb-3">Frictionless Order Generation</h3>
              <p className="text-sm text-[#54595F] leading-relaxed">
                Buyers browse a fast, beautiful catalog, select their variants (size, color), and checkout. The app compiles the cart into a perfectly formatted, easy-to-read text block that gets sent directly to your chat.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1A191A]/10 bg-[#FFFDF0] p-3 border border-[#1A191A]/20 rounded-[4px]">
              <p className="font-mono text-[10px] text-slate-700 leading-tight">
                *NEW ORDER ORD-482*<br/>
                - Anti-Tarnish Korean Earrings x 2 (Silver)<br/>
                - Minimalist Silver Ring x 1 (Size 7)<br/>
                Total: ₹1,297<br/>
                Customer: +91 98765 43210
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Aggressive Feature Matrix Comparison Table */}
      <section id="comparison" className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1A191A]/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Aggressive Feature Matrix
          </h2>
          <p className="text-md md:text-lg text-[#54595F]">
            Compare Chatcart side-by-side with the standard WhatsApp catalog features.
          </p>
        </div>

        <div className="max-w-5xl mx-auto overflow-x-auto border border-[#1A191A] rounded-[4px] neo-shadow bg-[#FFFFFF]">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A191A] bg-[#FFC629]/10">
                <th className="py-4 px-6 text-sm font-black uppercase tracking-wider text-[#1A191A] w-1/3">Feature</th>
                <th className="py-4 px-6 text-sm font-bold uppercase tracking-wider text-[#54595F] w-1/3 border-l border-[#1A191A]">Standard WhatsApp Catalog</th>
                <th className="py-4 px-6 text-sm font-black uppercase tracking-wider text-[#1A191A] w-1/3 border-l border-[#1A191A] bg-[#FFC629]/20">Chatcart Upgrade</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feat: "Product Stability", wa: "Products disappear randomly", cc: "Never disappears (Archived safely)", bold: true },
                { feat: "Catalog Search", wa: "Missing or limited searching", cc: "Full name, variant & category search" },
                { feat: "Product Sorting", wa: "Randomized by algorithm", cc: "Drag-and-drop manual control", bold: true },
                { feat: "Approval Time", wa: "15–30 minute mandatory delay", cc: "100% Instant & live" },
                { feat: "Product Variants", wa: "No custom size/color options", cc: "Full variant support", bold: true },
                { feat: "Custom Branding", wa: "Locked to Meta layout", cc: "Custom store logo + tagline" }
              ].map((row, i) => (
                <tr 
                  key={i} 
                  className={`border-b border-[#1A191A] last:border-0 hover:bg-[#FFFDF0]/50 transition-colors ${row.bold ? "bg-[#FFFDF0]/30" : ""}`}
                >
                  <td className="py-4 px-6 text-sm font-black">{row.feat}</td>
                  <td className="py-4 px-6 text-sm text-[#54595F] border-l border-[#1A191A] flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{row.wa}</span>
                  </td>
                  <td className="py-4 px-6 text-sm text-[#1A191A] font-bold border-l border-[#1A191A] bg-[#FFC629]/5">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3px]" />
                      <span>{row.cc}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Modern Multi-Tier Pricing Stack */}
      <section id="pricing" className="bg-[#FFFFFF]/50 border-t border-b border-[#1A191A] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Simple, High-Conviction Pricing
            </h2>
            <p className="text-md md:text-lg text-[#54595F]">
              Select a plan that fits your volume. Build your catalog in minutes.
            </p>
          </div>

          {/* Pricing warning container */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="bg-[#FFFDF0] border border-[#1A191A] rounded-[4px] p-4 flex items-start gap-3 shadow-[2px_2px_0px_0px_#1A191A]">
              <span className="text-[#FFC629] text-xl leading-none">⚠️</span>
              <p className="text-xs md:text-sm font-bold text-[#1A191A]">
                Note: Our early-bird launch pricing is scaling up soon to support high-volume server traffic. Lock in your lifetime or monthly tier rate today.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch mb-16">
            {/* Starter Tier */}
            <div className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between neo-shadow">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-[#54595F] mb-1">Starter</h3>
                <p className="text-xs text-[#54595F] mb-6">For starting out.</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-black tracking-tight">₹99</span>
                  <span className="text-xs text-[#54595F] line-through">₹199</span>
                  <span className="text-xs text-[#54595F] font-bold">/month</span>
                </div>
                <hr className="border-[#1A191A]/10 mb-6" />
                <ul className="space-y-4">
                  {[
                    "Up to 25 active products",
                    "WhatsApp ordering Integration",
                    "Search, sort & keep archived items",
                    "Email support (within 24 hours)"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <a 
                  href="#interactive-qualifier"
                  className="neo-btn rounded-[4px] block w-full text-center py-3 text-xs font-bold bg-[#FFFFFF] hover:bg-[#FFFDF0]"
                >
                  Choose Starter
                </a>
              </div>
            </div>

            {/* Growth Tier */}
            <div className="bg-[#FFFFFF] border border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between neo-shadow">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-[#54595F] mb-1">Growth</h3>
                <p className="text-xs text-[#54595F] mb-6">For growing sellers.</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-black tracking-tight">₹199</span>
                  <span className="text-xs text-[#54595F] line-through">₹399</span>
                  <span className="text-xs text-[#54595F] font-bold">/month</span>
                </div>
                <hr className="border-[#1A191A]/10 mb-6" />
                <ul className="space-y-4">
                  {[
                    "Up to 100 active products",
                    "Everything in Starter plan",
                    "Size, color & custom variants",
                    "Priority support (4-6h response)"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <a 
                  href="#interactive-qualifier"
                  className="neo-btn rounded-[4px] block w-full text-center py-3 text-xs font-bold bg-[#FFFFFF] hover:bg-[#FFFDF0]"
                >
                  Choose Growth
                </a>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-[#FFFFFF] border-2 border-[#1A191A] rounded-[4px] p-8 flex flex-col justify-between shadow-[0px_8px_0px_0px_#1A191A] relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#FFC629] text-[#1A191A] text-[9px] font-black tracking-widest px-3 py-1 uppercase rounded-full border border-[#1A191A]">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider text-[#1A191A] mb-1">Pro</h3>
                <p className="text-xs text-[#54595F] mb-6">For professional sellers.</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-black tracking-tight">₹299</span>
                  <span className="text-xs text-[#54595F] line-through">₹599</span>
                  <span className="text-xs text-[#54595F] font-bold">/month</span>
                </div>
                <hr className="border-[#1A191A]/10 mb-6" />
                <ul className="space-y-4">
                  {[
                    "Unlimited active products",
                    "Everything in Growth plan",
                    "Custom branding (Logo + Tagline)",
                    "Remove 'Powered by' branding",
                    "Bulk CSV import / export tools",
                    "WhatsApp + Phone support 24/7"
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs font-bold">
                      <Check className="w-3.5 h-3.5 text-[#FFC629] shrink-0 stroke-[3px]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <a 
                  href="#interactive-qualifier"
                  className="neo-btn rounded-[4px] block w-full text-center py-3 text-xs font-bold bg-[#1A191A] text-[#FFFFFF] hover:bg-[#2A292A]"
                >
                  Choose Pro
                </a>
              </div>
            </div>
          </div>

          {/* The Hero Lifetime Deal Card (LTD) */}
          <div className="max-w-5xl mx-auto bg-[#FFFDF0] border-2 border-[#1A191A] rounded-[4px] p-8 md:p-12 shadow-[0px_8px_0px_0px_#1A191A] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#FFC629] text-[#1A191A] font-black text-[11px] px-6 py-2 uppercase border-b border-l border-[#1A191A] tracking-widest rounded-bl-[4px]">
              LIFETIME OFFER
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <h3 className="text-2xl md:text-3xl font-black mb-4 flex items-center gap-2">
                  <span>💎</span> The Ultimate No-Brainer: The Limited Lifetime Deal
                </h3>
                <p className="text-sm text-[#54595F] leading-relaxed mb-6">
                  Pay once. Own your customer checkouts forever. Get full Pro-tier access—unlimited products, custom branding, and 24/7 priority support—for a single, one-time investment. No renewals. No surprises.
                </p>
                <div className="inline-flex items-center gap-2 bg-[#FFD9D9] text-[#A61C1C] text-[11px] font-bold px-3 py-1.5 rounded-[4px] border border-[#A61C1C]/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>⚠️ Only 98 spots remaining before this offer permanently converts to monthly billing.</span>
                </div>
              </div>
              
              <div className="bg-[#FFFFFF] border border-[#1A191A] p-6 rounded-[4px] text-center neo-shadow">
                <span className="text-[11px] font-black text-[#54595F] tracking-widest uppercase block mb-1">One-time payment</span>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-5xl font-black text-[#1A191A]">₹9,999</span>
                  <span className="text-sm text-[#54595F] line-through">₹19,999</span>
                </div>
                <a 
                  href={LTD_WA_LINK}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="neo-btn rounded-[4px] block w-full py-4 text-xs font-black bg-[#FFC629] text-[#1A191A] hover:bg-[#e8b21c] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Claim Deal on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Interactive Close (Progressive Step Qualification Form) */}
      <section id="interactive-qualifier" className="bg-[#1A191A] text-[#FFFFFF] py-24 border-t border-[#1A191A]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Get Started with Chatcart
            </h2>
            <p className="text-sm md:text-md text-[#BFBFBF] max-w-lg mx-auto">
              Configure your customized Catalog Engine in under 60 seconds by answering these 3 simple questions.
            </p>
          </div>

          {/* Form Card Container */}
          <div className="bg-[#FFFFFF] text-[#1A191A] border-2 border-[#1A191A] rounded-[4px] p-8 shadow-[0px_8px_0px_0px_#FFC629] relative overflow-hidden min-h-[360px] flex flex-col justify-between">
            
            {/* Step Wizard Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-[#54595F] mb-2">
                <span>Step {step} of 3</span>
                <span>{step === 1 ? "Intent Check" : step === 2 ? "Pain Points" : "Configuration"}</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#F3F4F6] border border-[#1A191A] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FFC629] border-r border-[#1A191A] transition-all duration-500 ease-out" 
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-black">1. Do you actively use WhatsApp to take customer orders?</h3>
                    <div className="space-y-3">
                      {[
                        "Yes, we manage heavy daily customer chat volume.",
                        "Yes, we are just starting out with direct messaging.",
                        "No, we use traditional website checkouts exclusively."
                      ].map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleStep1Select(option)}
                          className={`w-full text-left p-4 rounded-[4px] border ${
                            step1Answer === option 
                              ? "border-2 border-[#1A191A] bg-[#FFC629]/10 font-bold" 
                              : "border-[#1A191A]/20 bg-[#F3F4F6] hover:bg-[#FFFFFF] hover:border-[#1A191A]/50"
                          } transition-all duration-150 flex items-center justify-between text-sm`}
                        >
                          <span>{option}</span>
                          <span className={`w-4 h-4 rounded-full border border-[#1A191A] flex items-center justify-center ${step1Answer === option ? "bg-[#FFC629]" : "bg-[#FFFFFF]"}`}>
                            {step1Answer === option && <span className="w-1.5 h-1.5 rounded-full bg-[#1A191A]" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-black">2. What is your biggest frustration with the native WhatsApp catalog?</h3>
                    <div className="space-y-3">
                      {[
                        "Products disappear randomly without warning",
                        "No search bar or custom category sorting",
                        "Meta approval delays are too slow",
                        "Customers send messy screenshots instead of clean orders"
                      ].map((option, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleStep2Select(option)}
                          className={`w-full text-left p-4 rounded-[4px] border ${
                            step2Answer === option 
                              ? "border-2 border-[#1A191A] bg-[#FFC629]/10 font-bold" 
                              : "border-[#1A191A]/20 bg-[#F3F4F6] hover:bg-[#FFFFFF] hover:border-[#1A191A]/50"
                          } transition-all duration-150 flex items-center justify-between text-sm`}
                        >
                          <span>{option}</span>
                          <span className={`w-4 h-4 rounded-full border border-[#1A191A] flex items-center justify-center ${step2Answer === option ? "bg-[#FFC629]" : "bg-[#FFFFFF]"}`}>
                            {step2Answer === option && <span className="w-1.5 h-1.5 rounded-full bg-[#1A191A]" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-black">3. Connect your WhatsApp Number</h3>
                    <p className="text-xs text-[#54595F]">
                      Enter your primary business WhatsApp phone number. We will use this to route checkout orders directly into your chat.
                    </p>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wide text-[#54595F] mb-1.5">
                          WhatsApp Phone Number
                        </label>
                        <input 
                          type="text" 
                          placeholder="+91 " 
                          className="w-full p-4 rounded-[4px] border-2 border-[#1A191A] font-bold text-lg focus:outline-none focus:bg-[#FFFDF0]"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                      
                      {formSuccess ? (
                        <div className="bg-[#FFFDF0] border border-[#FFC629] text-[#1A191A] text-sm p-4 rounded-[4px] font-bold text-center flex items-center justify-center gap-2 animate-bounce">
                          <Check className="w-5 h-5 text-emerald-600 stroke-[3px]" />
                          <span>Qualification complete! Launching your dashboard...</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={formSubmitting || !phone.trim() || phone === "+91 "}
                          className="w-full py-4 rounded-[4px] border-2 border-[#1A191A] bg-[#1A191A] text-[#FFFFFF] hover:bg-[#2A292A] font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {formSubmitting ? (
                            <>
                              <RotateCw className="w-4 h-4 animate-spin" />
                              <span>Configuring Server...</span>
                            </>
                          ) : (
                            <span>Launch Your Catalog Now →</span>
                          )}
                        </button>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step Wizard Action Footer */}
            <div className="mt-8 pt-4 border-t border-[#1A191A]/10 flex justify-between items-center">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-black uppercase tracking-wider text-[#54595F] hover:text-[#1A191A]"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 ? !step1Answer : !step2Answer}
                  className="neo-btn rounded-[4px] bg-[#1A191A] text-[#FFFFFF] hover:bg-[#2A292A] text-xs font-black uppercase tracking-widest px-6 py-3 disabled:opacity-50"
                >
                  Continue →
                </button>
              ) : (
                <div />
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 mt-16 pt-12 border-t border-[#1A191A]/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-xs text-[#54595F]">
          © {new Date().getFullYear()} Chatcart. The Bulletproof Catalog Engine™. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-[#54595F] font-bold">
          <Link href="/terms" className="hover:text-[#FFC629] transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[#FFC629] transition-colors">Privacy Policy</Link>
          <Link href="/disclaimer" className="hover:text-[#FFC629] transition-colors">Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
