---
name: MSG91 OTP setup
description: What it took to get MSG91 OTP SMS delivery working in Chatcart
---

## Required credentials
- `MSG91_AUTH_KEY` — API auth key from MSG91 Settings → Authkey (NOT the OTP Widget Token from OTP → Tokens)
- `MSG91_TEMPLATE_ID` — MSG91 internal template ID (24-char hex, found in MSG91 OTP → Templates, NOT the STPL DLT ID)
- `MSG91_SENDER_ID` — sender header string e.g. `AROGRP`

**Why:** These are three distinct values. The OTP Widget Token looks identical in format to the Auth Key but is scoped only for widget/SDK use and silently fails for server-side API calls.

## MSG91_SENDER_ID must be an env var, not a secret
Set via `setEnvVars({ values: { MSG91_SENDER_ID: "AROGRP" } })`. If added only as a Replit Secret name with no value, `process.env.MSG91_SENDER_ID` resolves to `undefined` and the `configured` check in `sms.ts` fails silently (takes dev bypass path in development, throws in production).

## sendOtp() must be explicitly called in auth.ts
The function is imported at the top of `auth.ts` — make sure `await sendOtp(normalizedPhone, code)` is present in the send-otp route handler (after DB insert, before recordSendOtp). It was accidentally omitted, causing OTP codes to be saved to the DB but never transmitted.

## API endpoint used
`POST https://api.msg91.com/api/v5/otp` with query params: `template_id`, `mobile` (no `+` prefix), `authkey`, `sender`, `otp`.

## IP Security
When creating the MSG91 Authkey, set IP Security to OFF — Replit uses dynamic IPs.

## DLT (India telecom compliance)
- STPL DLT template ID: `1707178222723263947` (used only on STPL portal, not in code)
- PE-TM chain binding must be completed between STPL and MSG91 before SMS delivers
- Template text: `Your https://chatcart.in login OTP is ##OTP##. Valid for 10 minutes. Do not share with anyone. - ARORA GROUP`
