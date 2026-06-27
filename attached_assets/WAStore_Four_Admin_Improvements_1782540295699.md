# WAStore Builder — Four Admin Improvements (Priority Order: Build/Verify in This Sequence)

Context: Four separate improvements to the WhatsApp Marketing tool and admin panel. Build and verify each one in the order listed below — do not treat this as one combined task, since they touch different parts of the system and should be confirmed independently.

---

## TASK 1 (HIGHEST PRIORITY) — Prevent Campaign Leads From Silently Stalling on Repeated Send Failures

Context: If a WhatsApp message send fails (network issue, temporary WhatsApp rate-limiting, invalid number, connection drop), there is currently no visible handling of this — a lead could silently stop receiving their sequence with no indication anything went wrong, which could go unnoticed for weeks.

1. Add explicit error handling around every outbound send attempt in the campaign scheduler. Catch and log any failure (Baileys connection error, send timeout, WhatsApp-returned error response).
2. Track failure count per lead (e.g. a `sendFailureCount` column on the lead record). On a single failure, retry once after a short delay (e.g. 5-10 minutes) before giving up on that specific send attempt.
3. If a lead's send fails repeatedly (e.g. 3 consecutive failures across retries), mark that lead's status as `send_failed` (distinct from `paused_no_reply`) — this should NOT silently continue trying indefinitely, and should NOT be confused with the reply-gating pause state.
4. Surface `send_failed` leads clearly in the admin UI — a visible count/filter (e.g. "3 leads with send failures") separate from normal active/paused leads, so this is impossible to miss when checking campaign health.
5. If the Baileys connection itself drops entirely (not just one message failing, but the whole session disconnecting), the scheduler should detect this and pause ALL campaign processing until reconnected — rather than repeatedly failing every single due lead in a tight loop. Log this connection-level failure distinctly from individual message failures.
6. Add this failure visibility to the existing health monitoring dashard (alongside reply rate, messages sent) — e.g. a "failed sends" metric.

### Proof required
- Simulate a send failure (e.g. temporarily disconnect the Baileys session, or target an invalid number) and confirm: the failure is logged, the retry happens once, and after repeated failure the lead is correctly marked `send_failed` and visible in the admin UI — not silently stuck.
- Confirm a full connection drop pauses the whole scheduler rather than looping failures across all due leads.

---

## TASK 2 — Remove a Seller From a WA Sequence Directly From Their Profile

1. On the seller detail page in the admin panel (where subscription/plan management already happens), add a section showing if this seller is currently enrolled in any active WhatsApp campaign sequence — show the sequence name, current day, and status.
2. Add a clear "Remove from sequence" button in this section. Tapping it immediately stops any further scheduled messages to this seller from that sequence (e.g. set their lead status to `removed_manually`, distinct from `paused_no_reply` and `send_failed`).
3. This should take effect immediately — no further messages should be sent to this seller once removed, even if the scheduler is mid-tick.
4. This same control should also be reachable from the existing WhatsApp Marketing leads view (not just the seller's profile) for consistency, if that's a small addition — but the seller-profile entry point is the priority for this task.

### Proof required
- Enroll a test seller in a sequence, confirm the sequence status is visible on their profile page.
- Tap "Remove from sequence," confirm their status updates correctly, and confirm no further scheduled message goes out to them (e.g. by checking the next scheduler tick doesn't process them).

---

## TASK 3 — Purge Stale Baileys Key Files From Object Storage

Context: Baileys' session management writes numerous key/session sync files over time, and old/stale ones accumulate without cleanup, adding unnecessary storage cost.

1. Identify which files in the `wa-session` storage are genuinely stale/safe to remove — likely old `session-*.json` and `app-state-sync-*.json` files that are no longer referenced by the active session (Baileys' own session-management library may have guidance on which files are safe to prune; check for this rather than guessing).
2. Write a one-time cleanup script to purge the current backlog (4,000+ stale files) safely — confirm this does NOT touch `creds.json` (the core active credential file) or any file still actively in use by the current connected session.
3. Add ongoing cleanup: either a scheduled periodic job (e.g. weekly) or a check integrated into the existing connection logic, so stale files don't re-accumulate indefinitely going forward.
4. Confirm the live WhatsApp connection continues to work correctly after cleanup — do not risk breaking the active session to save storage cost; if there's any doubt about a file's safety to remove, leave it rather than risk disconnecting the live number.

### Proof required
- Show the before/after file count in storage.
- Confirm the WhatsApp connection remains active and functional after the cleanup (send a real test message post-cleanup to confirm nothing broke).
- Confirm the ongoing cleanup mechanism is in place to prevent future re-accumulation.

---

## TASK 4 — Bulk-Move Sellers From Trial/Pending to an Active Paid Plan

1. On the admin Sellers list, add multi-select checkboxes (or equivalent) allowing the admin to select multiple sellers at once.
2. Add a bulk action: "Activate selected sellers" — opens a simple form to choose the plan (starter/growth/pro/lifetime) and apply it to all selected sellers in one action, reusing the existing single-seller plan-change logic underneath (not a separate, untested code path).
3. Confirm this respects all existing logic already in place for individual plan changes — e.g. correctly setting `plan_started_at`, and any other fields normally set when a seller is activated one at a time.
4. Show a clear confirmation/summary before applying (e.g. "Activate 5 sellers to Starter plan?") to avoid accidental bulk changes.

### Proof required
- Select 2-3 test sellers currently in `pending` status, bulk-activate them to a plan, and confirm each one is correctly updated (plan, status, relevant timestamps) exactly as if they'd been activated individually.
