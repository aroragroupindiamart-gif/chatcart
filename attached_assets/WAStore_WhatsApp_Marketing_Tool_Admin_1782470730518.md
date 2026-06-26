# WAStore Builder — WhatsApp Marketing/Campaign Tool Inside Super Admin Panel

Context: This is a new module inside the existing platform Super Admin panel (separate from seller dashboards, separate auth, already built). It connects to WhatsApp via Baileys (unofficial WhatsApp Web protocol, QR-code-based) to run lead-conversion campaigns for sellers who signed up but didn't convert. The platform owner is knowingly accepting the ban/risk profile of this approach. Build this with as many risk-reduction safeguards as reasonably possible, on a DEDICATED number separate from any number used for core seller-facing order handoff.

## TASK 1 — Baileys Connection Setup

1. Add a new section in the Super Admin panel: "WhatsApp Marketing" (new nav item, admin-only, same auth-gating as the rest of the admin panel).
2. Implement a Baileys (`@whiskeysockets/baileys`) connection handler on the backend: generate and display a QR code in this admin screen, allow scanning with the dedicated WhatsApp marketing number, and persist the resulting session/auth credentials securely server-side so reconnection doesn't require re-scanning every time the server restarts.
3. Show clear connection status in the UI: Connected / Disconnected / QR pending, with the connected phone number displayed once linked.
4. Store this connection's session data securely — encrypted at rest if possible, and never exposed via any API response to anyone other than an authenticated admin.

## TASK 2 — Risk-Reduction Safeguards (build these as core requirements, not optional extras)

1. **Rate limiting**: hard-cap outbound messages to a configurable daily maximum (default 30-50/day), enforced server-side, not just a UI suggestion.
2. **Human-like timing**: introduce randomized delays between messages (not fixed intervals) — e.g. a random delay of 30-180 seconds between sends, plus a simulated "typing" indicator before each message where Baileys supports it.
3. **New number warm-up mode**: for the first 14 days after a number is connected, automatically restrict sending to a much lower volume (e.g. max 10/day) regardless of the configured daily max, ramping up gradually. Track "days since connection" per linked number to enforce this automatically.
4. **Reply-gated sequencing**: for any multi-day drip sequence, if a recipient has NOT replied to a previous message in the sequence, do not send them the next message in that sequence automatically — pause that specific recipient's sequence until they reply, or require manual admin override to continue. This is critical — do not build a system that blindly pushes all 8 days to everyone regardless of engagement.
5. **Opt-in/contact-source restriction**: only allow campaigns to be sent to contacts who originated from an inbound source (e.g. a seller who signed up via the platform, or someone who messaged first via the Click-to-WhatsApp lead flow) — do not build any feature for importing/messaging cold contact lists that never interacted with the platform.
6. **Health monitoring dashboard**: show basic health metrics in the admin UI — messages sent today/this week, reply rate (%), any errors/disconnects from the Baileys connection. If reply rate drops below a configurable threshold (e.g. 10%), show a clear warning banner recommending the admin pause sending.
7. **Manual pause/resume control**: a clear, one-tap "Pause all sending" control in the admin UI, usable at any time, with sending immediately and fully stopping when activated.
8. **Message content variation**: support simple template variables (e.g. {{name}}, {{storeName}}) so messages aren't 100% identical text to every recipient, even within the same campaign day.

## TASK 3 — Lead List & Sequence Management

1. Pull the list of sellers currently in `pending` status (signed up but not yet activated/converted) into this admin screen as the initial audience for campaigns — reuse existing seller data already in the admin panel, don't duplicate it into a separate contact list.
2. Allow the admin to create a sequence: a series of messages (up to 8, per the current use case, but support more if needed later) with a defined day-offset for each (Day 1, Day 2, etc.) and the message text for each step (supporting the {{name}}/{{storeName}} variables from Task 2.8).
3. Allow assigning a sequence to a selected set of pending sellers, starting the sequence for each at "Day 1" from whenever they're added.
4. Track and display, per lead: which day of the sequence they're on, whether they've replied to any message, and whether their sequence is active or paused (per the reply-gating logic in Task 2.4).
5. A simple campaign-level view: how many leads are in a given sequence, how many have replied at each stage, basic conversion tracking (did this lead eventually get activated to a paid plan).

## What NOT to build
- No bulk import of contacts from outside the platform's own seller/lead data.
- No sending to any contact who hasn't first interacted with the platform (signed up, messaged via the WhatsApp widget, or come from a Click-to-WhatsApp ad).
- No removal of the reply-gating safeguard, even if it feels like it's slowing down campaign delivery — this is a deliberate risk-reduction feature, not a bug to optimize away.

## Proof required
1. Screenshot of the QR connection screen and confirmation of a successful scan/connection status.
2. Screenshot of the health monitoring dashboard showing real metrics.
3. Demonstrate creating an 8-day sequence with template variables, assigning it to 2-3 test leads, and confirm Day 1 sends correctly with variables properly substituted.
4. Demonstrate the reply-gating logic: simulate a test lead not replying to Day 1, confirm Day 2 is NOT automatically sent to that lead.
5. Demonstrate the manual pause control immediately stopping all pending sends when activated.
6. Confirm the rate limit and warm-up restrictions are enforced server-side with a live test (attempt to exceed the daily cap and confirm it's blocked).
