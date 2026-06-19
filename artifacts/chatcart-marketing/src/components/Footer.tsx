import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-lg leading-none font-bold">C</span>
              </div>
              Chatcart
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The WhatsApp catalog that never lets you down. Built by sellers, for sellers.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wider uppercase">Product</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wider uppercase">Company</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-wider uppercase">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Chatcart. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
