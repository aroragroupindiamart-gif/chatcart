import { removeToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { MessageCircle, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_WHATSAPP = "919999999999";

export default function PendingActivation() {
  const [, setLocation] = useLocation();

  function handleLogout() {
    removeToken();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#1A9E4A] flex items-center justify-center shadow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="white" stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Chatcart</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Account Pending Activation</h1>
            <p className="text-slate-600 leading-relaxed">
              Thanks for signing up! Your account is currently being reviewed.
              We'll reach out to you on WhatsApp shortly to get you set up.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium text-slate-700">What happens next?</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-[#1A9E4A] font-bold mt-0.5">1.</span>
                <span>Our team will review your signup</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1A9E4A] font-bold mt-0.5">2.</span>
                <span>We'll contact you on WhatsApp with a quick demo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1A9E4A] font-bold mt-0.5">3.</span>
                <span>Once confirmed, your store will be activated</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi! I just signed up on Chatcart and wanted to learn more.")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-[#25D366] hover:bg-[#22c55e] text-white gap-2">
                <MessageCircle className="w-4 h-4" />
                Contact us on WhatsApp
              </Button>
            </a>

            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-700 gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already spoke with us? Try refreshing — your account may have been activated.
        </p>
      </div>
    </div>
  );
}
