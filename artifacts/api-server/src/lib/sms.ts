const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;

const isDev = process.env.NODE_ENV !== "production";

export async function sendOtp(phone: string, otp: string): Promise<void> {
  const configured = MSG91_AUTH_KEY && MSG91_TEMPLATE_ID && MSG91_SENDER_ID;

  if (!configured) {
    if (isDev) {
      console.log(`[OTP-DEV] Phone: ${phone} — Code: ${otp}`);
      return;
    }
    throw new Error("MSG91 credentials not configured. Set MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, and MSG91_SENDER_ID.");
  }

  const mobile = phone.replace(/^\+/, "");

  const url = `https://api.msg91.com/api/v5/otp?template_id=${encodeURIComponent(MSG91_TEMPLATE_ID!)}&mobile=${encodeURIComponent(mobile)}&authkey=${encodeURIComponent(MSG91_AUTH_KEY!)}&sender=${encodeURIComponent(MSG91_SENDER_ID!)}&otp=${encodeURIComponent(otp)}`;

  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`MSG91 API error ${response.status}: ${body}`);
  }

  const data = await response.json().catch(() => null);

  if (data && data.type === "error") {
    throw new Error(`MSG91 error: ${data.message ?? JSON.stringify(data)}`);
  }

  console.log(`[OTP] Sent to ${phone} via MSG91`);
}
