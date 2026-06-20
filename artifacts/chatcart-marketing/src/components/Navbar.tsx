import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-lg leading-none font-bold">C</span>
              </div>
              Chatcart
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Button asChild className="font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="/app/">Get Started</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="space-y-1 px-4 pb-4 pt-2">
            <Link href="/" className="block py-2 text-base font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <Link href="/about" className="block py-2 text-base font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
            <Link href="/#pricing" className="block py-2 text-base font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/contact" className="block py-2 text-base font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
            <Button asChild className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="/app/">Get Started</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
