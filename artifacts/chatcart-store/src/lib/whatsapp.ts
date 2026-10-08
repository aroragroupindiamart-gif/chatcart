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

/**
 * Formats order details into a clean, structured WhatsApp message.
 */
export function buildWhatsAppText(order: Order, orderUrl: string): string {
  const payableTotal = order.payableTotalAmount ?? order.totalAmount;
  const lines: string[] = [
    `Hi! I'd like to confirm my order 🛍️`,
    ``,
    `*Order ID:* ${order.id}`,
    `*Store:* ${order.sellerStoreName ?? ""}`,
    ``,
    `*Items:*`,
  ];

  const maxItems = 5;
  const itemsToShow = order.items.slice(0, maxItems);

  for (const item of itemsToShow) {
    const variant = item.variantSnapshot ? ` (${item.variantSnapshot})` : "";
    if (item.isSoldOut) {
      lines.push(
        `• ${item.quantity}× ${item.productNameSnapshot}${variant} (Sold Out) — ₹0.00`
      );
    } else {
      lines.push(
        `• ${item.quantity}× ${item.productNameSnapshot}${variant} (${formatPrice(item.priceSnapshot)} each) — ${formatPrice(item.priceSnapshot * item.quantity)}`
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

  if (subtotal != null && ((gst != null && gst > 0) || (shipping != null && shipping > 0))) {
    lines.push(`*Items Subtotal:* ${formatPrice(subtotal)}`);
    if (gst != null && gst > 0) {
      const pct = order.gstPercentage ?? 0;
      lines.push(`*GST (${pct}%):* ${formatPrice(gst)}`);
    }
    if (shipping != null && shipping > 0) {
      const kgText = shippingKg != null && shippingKg > 0 ? ` (${shippingKg} kg shipping)` : "";
      lines.push(`*Shipping:* ${formatPrice(shipping)}${kgText}`);
    }
  }

  lines.push(`*Payable Balance: ${formatPrice(payableTotal)}*`);

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
