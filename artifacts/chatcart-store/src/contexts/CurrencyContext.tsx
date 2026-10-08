import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", locale: "en-IN", decimals: 0 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", locale: "en-US", decimals: 2 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", locale: "en-CA", decimals: 2 },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", locale: "en-AU", decimals: 2 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", locale: "en-GB", decimals: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", locale: "de-DE", decimals: 2 },
  AED: { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", locale: "en-AE", decimals: 2 },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "SG$", flag: "🇸🇬", locale: "en-SG", decimals: 2 },
  NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿", locale: "en-NZ", decimals: 2 },
};

export const DEFAULT_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.01032,
  CAD: 0.01474,
  AUD: 0.01484,
  GBP: 0.00782,
  EUR: 0.00924,
  AED: 0.03793,
  SGD: 0.01420,
  NZD: 0.01750,
};

function detectCurrencyFromClient(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (
      tz.startsWith("America/New_York") ||
      tz.startsWith("America/Chicago") ||
      tz.startsWith("America/Denver") ||
      tz.startsWith("America/Los_Angeles") ||
      tz.startsWith("America/Phoenix") ||
      tz.startsWith("America/Detroit") ||
      tz.startsWith("America/Indiana") ||
      tz.startsWith("America/Boise") ||
      tz.startsWith("America/Anchorage") ||
      tz.startsWith("Pacific/Honolulu") ||
      tz.startsWith("US/")
    ) {
      return "USD";
    }
    if (
      tz.startsWith("America/Toronto") ||
      tz.startsWith("America/Vancouver") ||
      tz.startsWith("America/Montreal") ||
      tz.startsWith("America/Edmonton") ||
      tz.startsWith("Canada/")
    ) {
      return "CAD";
    }
    if (tz.startsWith("Australia/")) {
      return "AUD";
    }
    if (tz.startsWith("Europe/London") || tz.startsWith("GB")) {
      return "GBP";
    }
    if (tz.startsWith("Asia/Dubai")) {
      return "AED";
    }
    if (tz.startsWith("Asia/Singapore")) {
      return "SGD";
    }
    if (tz.startsWith("Pacific/Auckland")) {
      return "NZD";
    }
    if (tz.startsWith("Europe/")) {
      return "EUR";
    }
  } catch {
    // fallback
  }
  return "INR";
}

interface CurrencyContextType {
  currency: CurrencyInfo;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  rates: Record<string, number>;
  convertPrice: (inrAmount: number) => number;
  formatPrice: (inrAmount: number, options?: { showBaseInr?: boolean }) => string;
  formatConverted: (convertedAmount: number, code?: string) => string;
  supportedCurrencies: CurrencyInfo[];
  detectedCountry: string | null;
  isBaseInr: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "chatcart_selected_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Check stored preference or detect from browser timezone
  const [currencyCode, setCurrencyCodeState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_CURRENCIES[stored]) {
        return stored;
      }
    } catch {
      // storage unavailable
    }
    return detectCurrencyFromClient();
  });

  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Fetch live exchange rates and Cloudflare GeoIP country on mount
  useEffect(() => {
    let mounted = true;
    api
      .getExchangeRates()
      .then((data) => {
        if (!mounted || !data) return;
        if (data.rates) {
          setRates((prev) => ({ ...prev, ...data.rates }));
        }
        if (data.detectedCountry) {
          setDetectedCountry(data.detectedCountry);
        }

        // If user hasn't manually selected a currency in this session or localStorage,
        // automatically adopt Cloudflare's detected currency
        const hasManualChoice = Boolean(localStorage.getItem(STORAGE_KEY));
        if (!hasManualChoice && data.detectedCurrency && SUPPORTED_CURRENCIES[data.detectedCurrency]) {
          setCurrencyCodeState(data.detectedCurrency);
        }
      })
      .catch((err) => {
        console.warn("[Currency] Failed to fetch live exchange rates, using defaults:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setCurrencyCode = useCallback((code: string) => {
    if (!SUPPORTED_CURRENCIES[code]) return;
    setCurrencyCodeState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // storage unavailable
    }
  }, []);

  const currency = useMemo(
    () => SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR,
    [currencyCode]
  );

  const isBaseInr = currency.code === "INR";

  const convertPrice = useCallback(
    (inrAmount: number) => {
      if (!inrAmount || isNaN(inrAmount)) return 0;
      if (currency.code === "INR") return inrAmount;
      const rate = rates[currency.code] ?? DEFAULT_RATES[currency.code] ?? 1;
      return Math.round(inrAmount * rate * 100) / 100;
    },
    [currency.code, rates]
  );

  const formatPrice = useCallback(
    (inrAmount: number, options?: { showBaseInr?: boolean }) => {
      if (inrAmount == null || isNaN(inrAmount)) return "—";

      if (currency.code === "INR") {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(inrAmount);
      }

      const rate = rates[currency.code] ?? DEFAULT_RATES[currency.code] ?? 1;
      const converted = inrAmount * rate;

      const formatted = new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);

      if (options?.showBaseInr) {
        const inrFormatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(inrAmount);
        return `${formatted} (~ ${inrFormatted})`;
      }

      return formatted;
    },
    [currency, rates]
  );

  const formatConverted = useCallback(
    (convertedAmount: number, code?: string) => {
      const targetCurr = code ? SUPPORTED_CURRENCIES[code] || currency : currency;
      return new Intl.NumberFormat(targetCurr.locale, {
        style: "currency",
        currency: targetCurr.code,
        minimumFractionDigits: targetCurr.decimals,
        maximumFractionDigits: targetCurr.decimals,
      }).format(convertedAmount);
    },
    [currency]
  );

  const supportedCurrencies = useMemo(() => Object.values(SUPPORTED_CURRENCIES), []);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyCode,
        setCurrencyCode,
        rates,
        convertPrice,
        formatPrice,
        formatConverted,
        supportedCurrencies,
        detectedCountry,
        isBaseInr,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Graceful fallback if rendered outside provider
    return {
      currency: SUPPORTED_CURRENCIES.INR,
      currencyCode: "INR",
      setCurrencyCode: () => {},
      rates: DEFAULT_RATES,
      convertPrice: (amt) => amt,
      formatPrice: (amt) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt),
      formatConverted: (amt) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amt),
      supportedCurrencies: Object.values(SUPPORTED_CURRENCIES),
      detectedCountry: null,
      isBaseInr: true,
    };
  }
  return ctx;
}
