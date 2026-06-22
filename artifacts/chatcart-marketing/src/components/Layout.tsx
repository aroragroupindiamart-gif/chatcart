import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ReactNode, useEffect, useState } from "react";

const WA_NUMBER = "919319724678";
const WA_MESSAGE = "Hi! I'm interested in Chatcart and have a few questions.";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

function WhatsAppWidget() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!tooltipDismissed) setShowTooltip(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [tooltipDismissed]);

  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => setShowTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  const dismiss = () => {
    setShowTooltip(false);
    setTooltipDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-end gap-2">
      {showTooltip && (
        <div className="mb-1 flex items-center gap-1.5 bg-white text-slate-700 text-sm font-medium px-3 py-2 rounded-xl shadow-lg border border-slate-100 whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300">
          Questions? Chat with us!
          <button
            onClick={dismiss}
            className="ml-1 text-slate-400 hover:text-slate-600 leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        aria-label="Chat on WhatsApp"
        className="group flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 fill-white"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.856L.057 23.886a.75.75 0 0 0 .906.975l6.218-1.63A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.724 9.724 0 0 1-4.989-1.371l-.357-.213-3.706.972.99-3.614-.233-.372A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
        </svg>
      </a>
    </div>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}
