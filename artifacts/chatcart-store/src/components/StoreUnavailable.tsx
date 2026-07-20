import React from "react";
import { Store } from "lucide-react";

export function StoreUnavailable({ storeName }: { storeName?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
            <Store className="w-8 h-8 text-slate-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">
            {storeName || "Store"}
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            This store is temporarily unavailable. Please check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
