---
name: WA Marketing module
description: Baileys-based WhatsApp drip-campaign tool in the Chatcart super-admin panel — connection quirks, auth, session, scheduler, inbound lead capture, flexible sequences, and media attachments.
---

## Key decisions

**@hapi/boom must be a direct dep of api-server.**  
Baileys pulls it as a transitive dep, but the ESM bundled dist/index.mjs can't resolve transitive packages at runtime. Install it with `pnpm --filter @workspace/api-server add @hapi/boom`. Do NOT import @hapi/boom directly in whatsapp.ts — let Baileys handle it internally; just ensure it's installed.

**Why:** ERR_MODULE_NOT_FOUND at runtime when connect() is called, because the bundler externalises Baileys (so it's a dynamic import) and Node can't find @hapi/boom in node_modules.

**SSE stream uses ?token= query param.**  
The `/api/admin/wa/stream` endpoint verifies the admin JWT from the `token` query param (not Authorization header) because `EventSource` in browsers cannot set custom headers.

**How to apply:** When adding new SSE endpoints, replicate the `verifyAdminToken(req.query.token)` pattern, not the `requireAdminAuth` middleware.

**CRITICAL: Dev server must NEVER auto-connect to WhatsApp when production is running.**  
Both the Replit dev API server and the production deployment use the same WhatsApp account. If both auto-connect they kick each other with Code 440 (connectionReplaced) every ~60s in an infinite loop — causing all campaign sends to fail with "WhatsApp not connected" or "Cannot read properties of null".

Fix applied:
- `initWA()` returns early when `NODE_ENV !== "production"` — dev server stays dark on startup
- `waAuthState.ts` uses environment-prefixed storage keys: `wa-session/` (prod) vs `wa-session-dev/` (dev)
- Admin can still manually click "Connect" in the WA Marketing panel during local dev testing

**Why:** Production deployment and Replit dev workflow both run the same api-server code sharing the same object storage bucket. Without isolation, every restart of either server triggers a 440 loop.

**Campaign scheduler — step selection uses gt(hourOffset, currentHourOffset) not eq(...).**  
The scheduler finds the next step with `gt(waSequenceStepsTable.hourOffset, lead.currentHourOffset)` ordered ASC. The +1 pattern breaks for non-consecutive offsets. After a step sends, `currentHourOffset` is set to `step.hourOffset` (the actual offset).

**Reply-gate removed.**  
The paused_no_reply status is no longer set by the scheduler. All sequence steps fire automatically on schedule regardless of whether the lead replied. Leads never get stuck after the first message.

**Send safety — null socket race condition fix.**  
`sendWAMessage` and `sendWAMediaMessage` capture `sock` into a local `localSock` before the 2–8s typing simulation delay. After delay, `state.status` is re-checked — throws "WhatsApp disconnected during send" cleanly instead of crashing with "Cannot read properties of null (reading 'sendMessage')".

**Code 440 reconnect backoff: 60s (vs 8s for other codes).**  
Prevents rapid flip-flop when something external kicks the session.

**Stable browser identity:** `browser: ["Chatcart", "Chrome", "120.0.0"]` in makeWASocket config — reduces session replacement frequency.

**Bulk actions:**  
`POST /admin/wa/leads/bulk` accepts `{ ids: number[], action: 'pause'|'resume'|'retry' }`.
Frontend has per-row checkboxes with select-all (indeterminate state) and bulk action bar in the Leads tab.

**waCampaignLeadsTable has nullable sellerId.**  
Nullable to support inbound leads who are not sellers. Scheduler leftJoins both sellersTable and waInboundLeadsTable.

**Inbound lead deduplication:** `wa_inbound_leads.phone` is UNIQUE. Upsert on conflict, messageCount++.

**Inbound lead phone format:** Stored without leading + (`919876543210`). Seller matching normalises to `+phone`.

**Media attachments per step (wa_sequence_steps):**  
Three nullable columns: `mediaUrl` (objectPath like `/objects/uploads/uuid`), `mediaType` (`image|video|document`), `mediaFilename`.

**Media type determination (server-side at upload time):**
- image/* ≤ 5MB → `image` (inline)
- video/* ≤ 16MB → `video` (inline)
- video/* 16-100MB → `document` + sizeWarning returned to client
- other / PDF ≤ 100MB → `document`
- >100MB rejected

**Media send in whatsapp.ts (`sendWAMediaMessage`):** Downloads file from GCS via `ObjectStorageService.getObjectEntityFile(objectPath)` then `file.download()` — returns Buffer, no need for public URL. Passes Buffer directly to Baileys `sock.sendMessage`.

**POST /api/admin/wa/leads enforces pending plan server-side.**  
After an audit finding, the endpoint validates all sellerIds correspond to `subscriptionPlan='pending'` sellers. UI-only restriction was insufficient.

**Files:**
- `artifacts/api-server/src/lib/whatsapp.ts` — Baileys singleton + sendWAMessage + sendWAMediaMessage + handleInboundLead + initWA
- `artifacts/api-server/src/lib/waCampaign.ts` — scheduler (gt/asc step selection, media send dispatch)
- `artifacts/api-server/src/lib/waAuthState.ts` — object storage session backup/restore (env-prefixed keys)
- `artifacts/api-server/src/routes/waMarketing.ts` — all WA admin endpoints + bulk leads action
- `artifacts/chatcart-admin/src/pages/WhatsAppMarketing.tsx` — 5-tab UI, flexible sequence builder with media upload, bulk actions
- `lib/db/src/schema/waMarketing.ts` — DB tables
