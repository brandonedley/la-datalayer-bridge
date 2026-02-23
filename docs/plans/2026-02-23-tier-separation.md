# Tier Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the monolithic `la-datalayer-bridge` repo into two standalone product repos — `ores-bridge-standard` (public) and `ores-bridge-advanced` (private) — then retire this repo.

**Architecture:** Each repo is a self-contained product with its own sender, receiver, minified files, README, LICENSE, and SETUP-GUIDE. Advanced gets the current codebase as-is (renamed). Standard is a stripped-down fork with only purchase/generate_lead + GCLID + iframe height. Both repos share the same `postMessage` protocol and configuration system.

**Tech Stack:** Vanilla JS (ES5 + targeted ES6), no build system, manual minification, GitHub CLI (`gh`).

---

### Task 1: Create the Advanced Repo

Create `brandonedley/ores-bridge-advanced` (private) from the current codebase. The current code already has everything — this is essentially a rename + tier labeling.

**Step 1: Create the repo on GitHub**

```bash
gh repo create brandonedley/ores-bridge-advanced --private --description "ORES Booking Widget Analytics Bridge (Advanced) — Full funnel tracking + Enhanced Conversions"
```

**Step 2: Clone it locally**

```bash
cd ~/dev
git clone git@github.com:brandonedley/ores-bridge-advanced.git
cd ores-bridge-advanced
```

**Step 3: Copy source files from la-datalayer-bridge**

```bash
cp ~/dev/la-datalayer-bridge/gtm-sender-tag.html .
cp ~/dev/la-datalayer-bridge/parent-receiver.js .
cp -r ~/dev/la-datalayer-bridge/min .
cp ~/dev/la-datalayer-bridge/LICENSE .
cp ~/dev/la-datalayer-bridge/SETUP-GUIDE.md .
```

**Step 4: Update tier labels in source files**

In `gtm-sender-tag.html`:
- HTML comment title (line 2): `Limo Anywhere dataLayer Bridge - GTM Sender Tag (Advanced)`
- Section header (line 30): `// LA DATALAYER BRIDGE - GTM SENDER TAG (ADVANCED)`
- WHAT IT DOES comment: add `- Tracks full booking funnel (form_start through purchase)` and `- Collects and hashes user data for Enhanced Conversions`

In `parent-receiver.js`:
- JSDoc title (line 3): `Limo Anywhere dataLayer Bridge - Parent Receiver (Advanced)`
- Section header (line 38): `// LA DATALAYER BRIDGE - PARENT RECEIVER (ADVANCED)`

**Step 5: Write README.md for Advanced**

New README tailored to the Advanced product. Should include:
- Title: `ORES Bridge — Advanced`
- Overview: full funnel tracking + Enhanced Conversions for the Limo Anywhere ORES booking widget
- Quick Start (same two-step: add receiver to page, deploy sender to GTM)
- Full event list: `form_start`, `view_item_list`, `select_item`, `add_contact_info`, `begin_checkout`, `add_payment_info`, `purchase`, `generate_lead`
- Enhanced Conversions section (SHA-256 hashed PII)
- Configuration options table (all `data-*` attributes)
- Mode detection explanation
- ORES Settings Compatibility section
- Quote detection explanation
- Event data examples
- Files table
- Troubleshooting section
- Architecture diagram
- License

Pull content from the current `la-datalayer-bridge/README.md` — most of it applies directly to Advanced.

**Step 6: Write SETUP-GUIDE.md for Advanced**

Copy from current `la-datalayer-bridge/SETUP-GUIDE.md`. Update the title to reference Advanced. The setup steps are identical.

**Step 7: Commit and push**

```bash
git add -A
git commit -m "feat: initial advanced tier — full funnel + Enhanced Conversions"
git push -u origin main
```

---

### Task 2: Create the Standard Repo

Create `brandonedley/ores-bridge-standard` (public) with stripped-down code.

**Step 1: Create the repo on GitHub**

```bash
gh repo create brandonedley/ores-bridge-standard --public --description "ORES Booking Widget Analytics Bridge (Standard) — Purchase conversion tracking with GCLID attribution"
```

**Step 2: Clone it locally**

```bash
cd ~/dev
git clone git@github.com:brandonedley/ores-bridge-standard.git
cd ores-bridge-standard
```

**Step 3: Copy LICENSE**

```bash
cp ~/dev/la-datalayer-bridge/LICENSE .
```

---

### Task 3: Write the Standard Sender

Create `gtm-sender-tag.html` for the Standard tier. This is the most surgical task — fork the Advanced sender and remove all Advanced-only code.

**Working directory:** `~/dev/ores-bridge-standard`

**What to keep from the Advanced `gtm-sender-tag.html`:**

| Section | Lines (in original) | Keep? |
|---------|---------------------|-------|
| HTML comment header | 1-24 | Yes (update to "Standard") |
| IIFE + version constants + config | 25-47 | Yes |
| `log()`, `isInIframe()` | 49-65 | Yes |
| `identifyEventType()`, `normalizeEventData()` | 67-108 | Yes |
| `sendToParent()` with quote branch | 110-167 | Yes |
| IFRAME HEIGHT SENDER | 169-246 | Yes |
| `interceptDataLayer()`, `protectDataLayer()` | 248-290 | Yes |
| ELEMENT OBSERVATION HELPERS | 292-343 | **No** |
| ENHANCED CONVERSIONS | 345-487 | **No** |
| QUOTE DETECTION | 489-541 | Yes |
| ECOMMERCE TRACKING | 543-776 | **No** |
| INITIALIZE | 778-811 | Yes (remove `setupEcommerceListeners()` call) |

**Step 1: Write `gtm-sender-tag.html`**

Create the file with kept sections. Key changes from original:

1. HTML comment title: `Limo Anywhere dataLayer Bridge - GTM Sender Tag (Standard)`
2. WHAT IT DOES: remove "Listens for user interactions (clicks, form focus)" line
3. Section header: `LA DATALAYER BRIDGE - GTM SENDER TAG (STANDARD)`
4. `init()` body — remove `setupEcommerceListeners();` call:

```javascript
  function init() {
    log('Initializing session:', SESSION_ID);

    if (!isInIframe()) {
      log('Not in iframe, sender disabled');
      return;
    }

    interceptDataLayer();
    protectDataLayer();
    setupHeightObserver();

    if (DEBUG) {
      sendToParent({
        event: 'la_bridge_init',
        la_session_id: SESSION_ID,
        la_widget_url: window.location.href,
        _debug_only: true
      });
    }

    log('Sender initialized');
  }
```

**Step 2: Verify no dangling references**

```bash
# Should return NO matches for removed functions:
grep -n 'setupEcommerceListeners\|observeForElement\|cleanupObserver\|sha256\|normalizeEmail\|normalizePhone\|normalizeName\|collectUserData\|getHashedUserData\|fireContactInfoEvent\|getFormData\|parsePrice\|getVehicleFromCard\|getAllVehicles\|getVehicleData\|getCheckoutData\|selectedVehicle\|formStartFired\|contactInfoCaptured\|activeObservers' gtm-sender-tag.html

# Should return matches for kept functions:
grep -n 'sendToParent\|isQuoteMode\|addBookingTypeToEvent\|getBookingType\|interceptDataLayer\|protectDataLayer\|setupHeightObserver' gtm-sender-tag.html
```

Expected: first grep returns nothing, second returns multiple matches.

---

### Task 4: Write the Standard Receiver

Create `parent-receiver.js` for the Standard tier. Only change from Advanced: reduce `GA4_EVENTS` to `purchase` and `generate_lead`.

**Working directory:** `~/dev/ores-bridge-standard`

**Step 1: Copy and modify**

Start from `~/dev/la-datalayer-bridge/parent-receiver.js`, then:

1. JSDoc title (line 3): `Limo Anywhere dataLayer Bridge - Parent Receiver (Standard)`
2. Section header (line 38): `// LA DATALAYER BRIDGE - PARENT RECEIVER (STANDARD)`
3. Replace `GA4_EVENTS` (lines 119-131) with:

```javascript
  // GA4 ecommerce events — Standard tier: purchase + generate_lead only
  var GA4_EVENTS = {
    'purchase': { name: 'purchase', params: ['transaction_id', 'value', 'currency', 'items', 'coupon', 'shipping', 'tax', 'booking_type', 'is_quote'] },
    'generate_lead': { name: 'generate_lead', params: ['value', 'currency', 'lead_source', 'transaction_id', 'booking_type', 'is_quote'] }
  };
```

Everything else stays identical.

**Step 2: Verify the diff is minimal**

```bash
diff ~/dev/la-datalayer-bridge/parent-receiver.js parent-receiver.js
```

Expected: only header lines and GA4_EVENTS differ.

---

### Task 5: Generate Standard Minified Files

**Working directory:** `~/dev/ores-bridge-standard`

**Step 1: Create min directory**

```bash
mkdir -p min
```

**Step 2: Minify sender**

```bash
# Extract JS from between <script> tags
sed -n '/<script>/,/<\/script>/p' gtm-sender-tag.html | sed '1d;$d' > /tmp/standard-sender.js

# Minify with terser
npx terser /tmp/standard-sender.js -c -m -o min/gtm-sender.min.js

# Create HTML-wrapped version
echo '<script>' > min/gtm-sender.min.html
cat min/gtm-sender.min.js >> min/gtm-sender.min.html
echo '</script>' >> min/gtm-sender.min.html
```

**Step 3: Minify receiver**

```bash
npx terser parent-receiver.js -c -m -o min/parent-receiver.min.js
```

**Step 4: Verify**

```bash
# Bridge ID preserved
grep -c 'LADB-2026-EDLEY-7X9K2' min/gtm-sender.min.js min/parent-receiver.min.js

# No Advanced-only functions leaked through
grep -c 'setupEcommerceListeners\|sha256\|getHashedUserData\|fireContactInfoEvent' min/gtm-sender.min.js

# Size reduction
wc -c gtm-sender-tag.html min/gtm-sender.min.html
wc -c parent-receiver.js min/parent-receiver.min.js
```

Expected: bridge ID count = 1 per file, no Advanced functions, min files smaller.

---

### Task 6: Write Standard Documentation and Push

**Working directory:** `~/dev/ores-bridge-standard`

**Step 1: Write README.md**

Standard README — simpler than Advanced. Should include:
- Title: `ORES Bridge — Standard`
- Overview: purchase conversion tracking + GCLID attribution for ORES booking widget
- Quick Start (receiver + sender setup)
- Events tracked: only `purchase` and `generate_lead` (with quote detection explanation)
- Configuration options table (same `data-*` attributes)
- Mode detection explanation
- ORES Settings Compatibility section
- Iframe auto-height resize section
- Files table (4 files: sender, receiver, 2 minified)
- Troubleshooting section
- Architecture diagram
- License
- "Upgrade to Advanced" callout — brief mention that Advanced adds full funnel + Enhanced Conversions

**Step 2: Write SETUP-GUIDE.md**

Simplified from the Advanced version:
- Same GTM sender deployment steps
- Same parent receiver installation steps
- Verification only checks for `purchase` event (not the full funnel)
- Events reference table: only `purchase` and `generate_lead`
- Remove Enhanced Conversions section entirely

**Step 3: Commit and push**

```bash
git add -A
git commit -m "feat: initial standard tier — purchase tracking with GCLID attribution"
git push -u origin main
```

---

### Task 7: Archive This Repo

**Working directory:** `~/dev/la-datalayer-bridge`

**Step 1: Update README to point to the new repos**

Add a prominent notice at the top of README.md:

```markdown
> **This repository has been superseded.** The bridge is now available as two products:
>
> - **[ORES Bridge — Standard](https://github.com/brandonedley/ores-bridge-standard)** (public) — Purchase conversion tracking + GCLID attribution
> - **[ORES Bridge — Advanced](https://github.com/brandonedley/ores-bridge-advanced)** (private) — Full funnel tracking + Enhanced Conversions
```

**Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add deprecation notice pointing to new tier repos"
git push
```

**Step 3: Archive the repo on GitHub**

```bash
gh repo archive brandonedley/la-datalayer-bridge --yes
```

---

## Summary

| Task | Repo | What |
|------|------|------|
| 1 | `ores-bridge-advanced` | Create repo, copy current code with tier labels |
| 2 | `ores-bridge-standard` | Create repo, copy LICENSE |
| 3 | `ores-bridge-standard` | Write stripped-down sender (remove ~450 lines) |
| 4 | `ores-bridge-standard` | Write receiver (GA4_EVENTS: 11 entries → 2) |
| 5 | `ores-bridge-standard` | Generate minified files |
| 6 | `ores-bridge-standard` | Write README, SETUP-GUIDE, push |
| 7 | `la-datalayer-bridge` | Add deprecation notice, archive |
