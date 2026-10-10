import { formatPrice, type Order } from "./api";

/**
 * Normalizes phone numbers to standard international format (without + or spaces).
 * Handles Indian numbers entered with 10 digits by prepending country code 91.
 */
export function formatWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // Leading zero removal for 11-digit numbers (e.g., 08505980759 -> 8505980759)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Standard 10-digit Indian phone number without country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  if (digits.length >= 11) {
    return digits;
  }
  return null;
}

export interface WhatsAppCurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

/**
 * Formats order details into a clean, structured WhatsApp message.
 * Supports multi-currency display when an international currency is active.
 */
export function buildWhatsAppText(
  order: Order,
  orderUrl: string,
  currencyInfo?: WhatsAppCurrencyInfo
): string {
  const payableTotal = order.payableTotalAmount ?? order.totalAmount;
  const isForeign = Boolean(currencyInfo && currencyInfo.code !== "INR" && currencyInfo.rate > 0);

  const formatAmt = (amt: number): string => {
    if (!isForeign || !currencyInfo) return formatPrice(amt);
    const converted = amt * currencyInfo.rate;
    const foreignStr = `${currencyInfo.symbol}${converted.toFixed(2)} ${currencyInfo.code}`;
    return `${foreignStr} (~ ${formatPrice(amt)})`;
  };

  const formatUnit = (amt: number): string => {
    if (!isForeign || !currencyInfo) return formatPrice(amt);
    const converted = amt * currencyInfo.rate;
    return `${currencyInfo.symbol}${converted.toFixed(2)}`;
  };

  const lines: string[] = [
    `Hi! I'd like to confirm my order 🛍️`,
    ``,
    `*Order ID:* ${order.id}`,
    `*Store:* ${order.sellerStoreName ?? ""}`,
  ];

  if (isForeign && currencyInfo) {
    lines.push(`*Selected Currency:* ${currencyInfo.code} (${currencyInfo.symbol})`);
  }

  lines.push(``, `*Items:*`);

  const maxItems = 5;
  const itemsToShow = order.items.slice(0, maxItems);

  for (const item of itemsToShow) {
    const variant = item.variantSnapshot ? ` (${item.variantSnapshot})` : "";
    if (item.isSoldOut) {
      lines.push(
        `• ${item.quantity}× ${item.productNameSnapshot}${variant} (Sold Out) — ₹0.00`
      );
    } else if (item.isPartiallyAvailable) {
      lines.push(
        `• ${item.quantity}× ${item.productNameSnapshot}${variant} (${item.effectiveQuantity} available) — ${formatAmt(item.priceSnapshot * (item.effectiveQuantity ?? item.quantity))}`
      );
    } else {
      lines.push(
        `• ${item.quantity}× ${item.productNameSnapshot}${variant} (${formatUnit(item.priceSnapshot)} each) — ${formatAmt(item.priceSnapshot * item.quantity)}`
      );
    }
  }

  if (order.items.length > maxItems) {
    lines.push(`• ... and ${order.items.length - maxItems} more items`);
  }

  lines.push(``);
  const subtotal = order.hasSoldOutItems ? (order.payableSubtotalAmount ?? order.subtotalAmount) : order.subtotalAmount;
  const gst = order.hasSoldOutItems ? (order.payableGstAmount ?? order.gstAmount) : order.gstAmount;
  const shipping = order.hasSoldOutItems ? (order.payableShippingAmount ?? order.shippingAmount) : order.shippingAmount;
  const shippingKg = order.hasSoldOutItems ? (order.payableShippingKg ?? order.shippingKg) : order.shippingKg;

  if (order.hasSoldOutItems) {
    const unavailableTotal = order.items.reduce(
      (sum, i) =>
        sum +
        i.priceSnapshot *
          (i.quantity - (i.effectiveQuantity ?? (i.isSoldOut ? 0 : i.quantity))),
      0
    );
    const gstDiff = Math.max(0, (order.gstAmount ?? 0) - (order.payableGstAmount ?? 0));

    if (order.subtotalAmount != null) {
      lines.push(`*Original Items Subtotal:* ${formatAmt(order.subtotalAmount)}`);
    }
    if (unavailableTotal > 0) {
      lines.push(`*Unavailable Items Deducted:* −${formatAmt(unavailableTotal)}`);
    }
    if (gstDiff > 0) {
      lines.push(`*GST Adjustment:* −${formatAmt(gstDiff)}`);
    }
    lines.push(``);
    if (subtotal != null) {
      lines.push(`*In-Stock Items Subtotal:* ${formatAmt(subtotal)}`);
    }
    if (gst != null && gst > 0) {
      const pct = order.gstPercentage ?? 0;
      lines.push(`*GST (${pct}%):* ${formatAmt(gst)}`);
    }
    if (shipping != null && shipping > 0) {
      const kgText = shippingKg != null && shippingKg > 0 ? ` (${shippingKg} kg)` : "";
      lines.push(`*Shipping:* ${formatAmt(shipping)}${kgText}`);
    }
    lines.push(``);
    lines.push(`*👉 FINAL PAYABLE BALANCE: ${formatAmt(payableTotal)}*`);
  } else {
    if (subtotal != null && ((gst != null && gst > 0) || (shipping != null && shipping > 0))) {
      lines.push(`*Items Subtotal:* ${formatAmt(subtotal)}`);
      if (gst != null && gst > 0) {
        const pct = order.gstPercentage ?? 0;
        lines.push(`*GST (${pct}%):* ${formatAmt(gst)}`);
      }
      if (shipping != null && shipping > 0) {
        const kgText = shippingKg != null && shippingKg > 0 ? ` (${shippingKg} kg shipping)` : "";
        lines.push(`*Shipping:* ${formatAmt(shipping)}${kgText}`);
      }
    }
    lines.push(`*Payable Balance: ${formatAmt(payableTotal)}*`);
  }

  if (order.customerContact) {
    lines.push(``);
    lines.push(`*My details:* ${order.customerContact}`);
  }

  lines.push(``);
  lines.push(`📸 View order with photos: ${orderUrl}`);

  return lines.join("\n");
}

/**
 * Builds universal WhatsApp web/app link.
 * api.whatsapp.com/send directly opens WhatsApp on Android & iOS without the wa.me interstitial.
 */
export function getWhatsAppUrl(phone: string | null | undefined, text: string): string | null {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}

/**
 * Builds direct app scheme for mobile devices (whatsapp://send).
 */
export function getWhatsAppDirectSchemeUrl(phone: string | null | undefined, text: string): string | null {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  return `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}
