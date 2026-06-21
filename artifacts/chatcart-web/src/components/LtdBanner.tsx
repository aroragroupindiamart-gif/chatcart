import { useState, useEffect } from "react";
import { useGetMe, useListProducts } from "@workspace/api-client-react";
import { X, Infinity } from "lucide-react";

const LTD_CAP = 100;
const SUPPORT_WHATSAPP = "919319724678";
const DISMISSED_KEY = "chatcart_ltd_dismissed";

interface LtdStatus {
  claimed: number;
  remaining: number;
  capReached: boolean;
}

export function LtdBanner() {
  const { data: seller } = useGetMe();
  const { data: products } = useListProducts(undefined, { query: { staleTime: Infinity } });
  const [ltdStatus, setLtdStatus] = useState<LtdStatus | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1"
  );

  useEffect(() => {
    fetch("/api/public/ltd-status")
      .then((r) => r.json())
      .then((d: LtdStatus) => setLtdStatus(d))
      .catch(() => {});
  }, []);

  const plan = (seller as any)?.subscriptionPlan as string | undefined;
  const eligiblePlan = plan === "starter" || plan === "growth";
  const isEngaged = Array.isArray(products) && products.length > 0;
  const capReached = ltdStatus?.capReached ?? false;

  if (!eligiblePlan || !isEngaged || capReached || dismissed || !ltdStatus) {
    return null;
  }

  const waText = encodeURIComponent(
    `Hi! I'm interested in the Chatcart lifetime deal (₹9,999 one-time). ${ltdStatus.remaining} of ${LTD_CAP} spots remaining.`
  );
  const waLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${waText}`;

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <div className="flex-shrink-0 w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
        <Infinity className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          Lifetime access to ALL Pro features — just ₹9,999 one-time
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Unlimited products, custom branding &amp; 24/7 priority support. Only{" "}
          <span className="font-semibold text-amber-700">
            {ltdStatus.remaining} of {LTD_CAP} spots
          </span>{" "}
          remaining.
        </p>
      </div>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 bg-[#25D366] hover:bg-[#22c55e] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        Get Lifetime Access
      </a>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(DISMISSED_KEY, "1");
        }}
        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
