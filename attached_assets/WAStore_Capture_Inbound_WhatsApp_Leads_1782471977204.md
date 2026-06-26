# WAStore Builder — Capture Inbound WhatsApp Messages as Leads (Addition to WhatsApp Marketing Tool)

Context: This extends the WhatsApp Marketing tool (Baileys connection, already specified in a previous task). Currently, that system can only send campaigns to existing `pending` sellers already in the database — it has no way of capturing someone who messages the connected WhatsApp number directly (e.g. via the homepage's floating WhatsApp widget, or replying to a Click-to-WhatsApp ad). This needs to be built so inbound contacts become real, usable leads.

## Required additions

1. **Incoming message listener**: using the existing Baileys connection (already built for outbound sending), also listen for and capture INCOMING messages sent to the connected number. For each incoming message, capture: sender's phone number, sender's WhatsApp display name (if available), message text, and timestamp.

2. **Lead matching logic**: when an incoming message arrives, check if the sender's phone number matches an existing seller record (any plan status — pending, starter, growth, pro, lifetime). 
   - If a match exists, log this inbound message against that existing seller's record (e.g. a simple message log/timeline visible in their admin detail view).
   - If no match exists, create a new lightweight "lead" record (separate from the full `sellers` table, since this person hasn't signed up — just phone number, display name, first message text/timestamp, and a status like "new").

3. **Inbound Leads view in the admin panel**: a new view (or a tab within the existing WhatsApp Marketing section) listing all inbound contacts — both new leads and those already matched to existing sellers — sortable by most recent message, with a clear visual distinction between "new contact" and "existing seller."

4. **Make these leads usable in campaigns**: both new leads and existing pending sellers should be addable to a campaign sequence (per the sequence system already specified) from this same Inbound Leads view — this is the key connection point: someone who messages you should be just as easy to add to a follow-up sequence as someone who signed up through the website.

5. **Mark inbound leads as "warm" contacts for risk purposes**: per the risk-reduction design already specified (only message contacts who initiated contact), these inbound leads should be flagged/treated as the safest, highest-priority audience for campaigns — since they messaged first, they carry the lowest ban risk per everything discussed about contact-graph distance and opt-in.

6. **Avoid duplicate/spam capture**: if the same phone number sends multiple messages, this should update/append to their existing lead record, not create duplicate lead entries each time.

## Proof required
1. Send a real test message to the connected WhatsApp number from a different phone, and show it correctly appearing in the new Inbound Leads view with the correct phone number and message content captured.
2. Demonstrate that if that same test number matches an existing seller record, the message is correctly linked to that seller rather than creating a duplicate lead.
3. Demonstrate adding a newly-captured inbound lead to a campaign sequence directly from this view.
4. Send a second message from the same test number and confirm it updates the existing lead record rather than creating a duplicate.
