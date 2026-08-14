import { Link } from "wouter";
import { MessageSquare, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-100 border-t border-slate-800 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <div className="bg-white px-3.5 py-2 rounded-xl shadow-sm border border-slate-200/50 inline-flex items-center">
                <img src="/logo.png" alt="Chatcart Logo" className="h-7 w-auto object-contain" />
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The catalog that never lets you down. Built by sellers, for sellers. Stop losing orders to WhatsApp Business bugs.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://wa.me/919319724678"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-2 rounded-lg border border-[#25D366]/30 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Support
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4">Product</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="text-slate-400 hover:text-white transition-colors">Features</Link></li>
              <li><a href="/#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/app/" className="text-slate-400 hover:text-white transition-colors">Dashboard Login</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/disclaimer" className="text-slate-400 hover:text-white transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Chatcart — operated by{" "}
            <span className="font-semibold text-slate-200">ARORA GROUP</span>. All rights reserved.
          </p>
          <p>
            Chatcart is a proprietary software product of ARORA GROUP.
          </p>
        </div>
      </div>
    </footer>
  );
}
