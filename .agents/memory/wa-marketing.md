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

**Session directory:** `artifacts/api-server/wa-session/` — useMultiFileAuthState persists here. If the directory exists on startup, initWA() auto-reconnects without needing to scan QR again.

**Campaign scheduler — step selection uses gt(dayOffset, currentDay) not eq(dayOffset, currentDay+1).**  
The scheduler finds the next step with `gt(waSequenceStepsTable.dayOffset, lead.currentDay)` ordered ASC — NOT `eq(dayOffset, currentDay+1)`. The +1 pattern breaks for non-consecutive day-offsets (e.g. Day 1, Day 4, Day 9). After a step sends, `currentDay` is set to `step.dayOffset` (the actual offset), not a counter.

**Why:** The sequence builder allows any dayOffset — gaps between days are intentional. Hardcoding +1 causes the scheduler to look for dayOffset=2 when none exists and incorrectly mark the lead as completed.

**Warmup, rate-limiting, reply-gating:** All work generically on "next due step" — not hardcoded to 8 steps or consecutive offsets. Reply-gate: if currentDay >= 1 and repliedAt IS NULL → paused_no_reply. Resume happens when incoming message updates repliedAt.

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
- `artifacts/api-server/src/lib/whatsapp.ts` — Baileys singleton + sendWAMessage + sendWAMediaMessage + handleInboundLead
- `artifacts/api-server/src/lib/waCampaign.ts` — scheduler (gt/asc step selection, media send dispatch)
- `artifacts/api-server/src/routes/waMarketing.ts` — all WA admin endpoints + /media/request-upload-url
- `artifacts/chatcart-admin/src/pages/WhatsAppMarketing.tsx` — 5-tab UI, flexible sequence builder with media upload
- `lib/db/src/schema/waMarketing.ts` — DB tables (mediaUrl/mediaType/mediaFilename on wa_sequence_steps)
