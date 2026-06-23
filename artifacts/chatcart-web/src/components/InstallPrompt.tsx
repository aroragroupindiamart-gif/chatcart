import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

const DISMISSED_KEY = "chatcart_install_dismissed";

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isInStandaloneMode() {
  return (
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowAndroid(false);
    setShowIOS(false);
    setDeferredPrompt(null);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setShowAndroid(false);
    setDeferredPrompt(null);
  };

  if (showAndroid) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Install Chatcart for faster access — opens like a regular app, no browser bar.
          </p>
          <button
            onClick={handleInstall}
            className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Install now
          </button>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (showIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
          <Share className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Add to Home Screen</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Tap <strong>Share</strong> <span className="inline-block">⎙</span> then{" "}
            <strong>"Add to Home Screen"</strong> to install Chatcart and open it like an app.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
