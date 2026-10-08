import React from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Globe } from "lucide-react";

export function CurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrencyCode, supportedCurrencies } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-background/80 hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer select-none ${className}`}
          aria-label="Change currency"
        >
          <span className="text-sm leading-none">{currency.flag}</span>
          <span>{currency.code}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg rounded-xl z-50">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          Select Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {supportedCurrencies.map((item) => {
            const isSelected = item.code === currency.code;
            return (
              <DropdownMenuItem
                key={item.code}
                onClick={() => setCurrencyCode(item.code)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                  isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.flag}</span>
                  <div className="flex flex-col">
                    <span className="leading-tight font-medium">
                      {item.code} <span className="text-muted-foreground">({item.symbol})</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{item.name}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
