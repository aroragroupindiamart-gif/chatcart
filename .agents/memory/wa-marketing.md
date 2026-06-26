---
name: WA Marketing module
description: Baileys-based WhatsApp drip-campaign tool in the Chatcart super-admin panel — connection quirks, auth, session, and scheduler details.
---

## Key decisions

**@hapi/boom must be a direct dep of api-server.**  
Baileys pulls it as a transitive dep, but the ESM bundled dist/index.mjs can't resolve transitive packages at runtime. Install it with `pnpm --filter @workspace/api-server add @hapi/boom`. Do NOT import @hapi/boom directly in whatsapp.ts — let Baileys handle it internally; just ensure it's installed.

**Why:** ERR_MODULE_NOT_FOUND at runtime when connect() is called, because the bundler externalises Baileys (so it's a dynamic import) and Node can't find @hapi/boom in node_modules.

**SSE stream uses ?token= query param.**  
The `/api/admin/wa/stream` endpoint verifies the admin JWT from the `token` query param (not Authorization header) because `EventSource` in browsers cannot set custom headers.

**How to apply:** When adding new SSE endpoints, replicate the `verifyAdminToken(req.query.token)` pattern, not the `requireAdminAuth` middleware.

**Session directory:** `artifacts/api-server/wa-session/` — useMultiFileAuthState persists here. If the directory exists on startup, initWA() auto-reconnects without needing to scan QR again.

**Campaign scheduler:** runs every 60 seconds in-process (startCampaignScheduler). Warmup: 10 msgs/day for first 14 days after connectedAt. Reply-gating: if currentDay >= 1 and lead has not replied, status → paused_no_reply. Incoming messages auto-resume paused leads.

**Files:**
- `artifacts/api-server/src/lib/whatsapp.ts` — Baileys singleton
- `artifacts/api-server/src/lib/waCampaign.ts` — scheduler engine
- `artifacts/api-server/src/routes/waMarketing.ts` — admin REST endpoints
- `artifacts/chatcart-admin/src/pages/WhatsAppMarketing.tsx` — 4-tab UI
- `lib/db/src/schema/waMarketing.ts` — DB tables
