# Tier Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the monolithic bridge into two separate file sets — Standard (purchase/generate_lead + GCLID + iframe height) and Advanced (full funnel + Enhanced Conversions) — so the product team can sell them as distinct tiers.

**Architecture:** Current root-level files become the Advanced tier (already have everything). Standard is a new stripped-down fork. Both tiers share the same `postMessage` protocol, configuration system, and version constants. Each tier is a self-contained sender/receiver pair with its own `min/` directory.

**Tech Stack:** Vanilla JS (ES5 + targeted ES6), no build system, manual minification.

---

### Task 1: Create Directory Structure

**Files:**
- Create: `standard/` directory
- Create: `standard/min/` directory
- Create: `advanced/` directory
- Create: `advanced/min/` directory

**Step 1: Create directories**

```bash
mkdir -p standard/min advanced/min
```

**Step 2: Verify**

```bash
ls -la standard/ standard/min/ advanced/ advanced/min/
```

Expected: four empty directories

**Step 3: Commit**

```bash
git add standard/.gitkeep advanced/.gitkeep standard/min/.gitkeep advanced/min/.gitkeep
git commit -m "chore: create standard and advanced tier directories"
```

Note: if git won't track empty dirs, create `.gitkeep` files or defer commit to next task.

---

### Task 2: Create Advanced Tier (Copy Current Files)

The current root-level files already contain everything. Copy them into `advanced/` as-is, then update the header comment to identify the tier.

**Files:**
- Create: `advanced/gtm-sender-tag.html` (copy from `gtm-sender-tag.html`)
- Create: `advanced/parent-receiver.js` (copy from `parent-receiver.js`)
- Create: `advanced/min/gtm-sender.min.html` (copy from `min/gtm-sender.min.html`)
- Create: `advanced/min/gtm-sender.min.js` (copy from `min/gtm-sender.min.js`)
- Create: `advanced/min/parent-receiver.min.js` (copy from `min/parent-receiver.min.js`)

**Step 1: Copy all files**

```bash
cp gtm-sender-tag.html advanced/gtm-sender-tag.html
cp parent-receiver.js advanced/parent-receiver.js
cp min/gtm-sender.min.html advanced/min/gtm-sender.min.html
cp min/gtm-sender.min.js advanced/min/gtm-sender.min.js
cp min/parent-receiver.min.js advanced/min/parent-receiver.min.js
```

**Step 2: Update header comment in `advanced/gtm-sender-tag.html`**

Change the HTML comment at the top (lines 1-24) — update the title line to:

```
  Limo Anywhere dataLayer Bridge - GTM Sender Tag (Advanced)
```

And the section header inside the IIFE (line 30):

```
  // LA DATALAYER BRIDGE - GTM SENDER TAG (ADVANCED)
```

**Step 3: Update header comment in `advanced/parent-receiver.js`**

Change the JSDoc title (line 3) to:

```
 * Limo Anywhere dataLayer Bridge - Parent Receiver (Advanced)
```

And the section header (line 38):

```
  // LA DATALAYER BRIDGE - PARENT RECEIVER (ADVANCED)
```

**Step 4: Verify files are identical to originals (minus header changes)**

```bash
diff <(tail -n +3 gtm-sender-tag.html) <(tail -n +3 advanced/gtm-sender-tag.html)
```

Expected: only the header/section-header lines differ.

**Step 5: Commit**

```bash
git add advanced/
git commit -m "feat: create advanced tier from current source files"
```

---

### Task 3: Create Standard Sender

Fork `gtm-sender-tag.html` into `standard/gtm-sender-tag.html`, removing all Advanced-only code. This is the most surgical task.

**Files:**
- Create: `standard/gtm-sender-tag.html`
- Reference: `gtm-sender-tag.html` (source to fork from)

**What to keep from `gtm-sender-tag.html`:**

| Section | Lines | Keep? |
|---------|-------|-------|
| HTML comment header | 1-24 | Yes (update title to "Standard") |
| IIFE + version constants + config | 25-47 | Yes (update section header) |
| `log()`, `isInIframe()` | 49-65 | Yes |
| `identifyEventType()`, `normalizeEventData()` | 67-108 | Yes |
| `sendToParent()` with quote branch | 110-167 | Yes |
| IFRAME HEIGHT SENDER | 169-246 | Yes |
| `interceptDataLayer()`, `protectDataLayer()` | 248-290 | Yes |
| ELEMENT OBSERVATION HELPERS | 292-343 | **No** (only used by view_item_list) |
| ENHANCED CONVERSIONS | 345-487 | **No** |
| QUOTE DETECTION | 489-541 | Yes |
| ECOMMERCE TRACKING | 543-776 | **No** |
| INITIALIZE | 778-811 | Yes (remove `setupEcommerceListeners()` call) |

**Step 1: Write `standard/gtm-sender-tag.html`**

The complete file contents — copy the kept sections in order, with these changes:

1. HTML comment title: `Limo Anywhere dataLayer Bridge - GTM Sender Tag (Standard)`
2. HTML comment WHAT IT DOES: remove "Listens for user interactions (clicks, form focus)" line
3. Section header: `LA DATALAYER BRIDGE - GTM SENDER TAG (STANDARD)`
4. `init()` function: remove the `setupEcommerceListeners();` call (line 792 in original)
5. Reorder: QUOTE DETECTION section should appear before `sendToParent()` since `sendToParent` calls `isQuoteMode()`. In the original this works because of function hoisting, and it will also work in the Standard version for the same reason — but for readability, keep the same order as the original (quote detection after interceptDataLayer/protectDataLayer).

The Standard sender `init()` should be:

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

    // Only send init event in debug mode (diagnostic only, not for GA4)
    if (DEBUG) {
      sendToParent({
        event: 'la_bridge_init',
        la_session_id: SESSION_ID,
        la_widget_url: window.location.href,
        _debug_only: true  // Signal to receiver: dataLayer only, skip gtag
      });
    }

    log('Sender initialized');
  }
```

**Step 2: Verify the Standard sender is correct**

Check that:
- No references to removed functions (`setupEcommerceListeners`, `observeForElement`, `sha256`, `getHashedUserData`, `fireContactInfoEvent`, `getFormData`, `getVehicleFromCard`, `getAllVehicles`, `getVehicleData`, `getCheckoutData`)
- No references to removed state (`selectedVehicle`, `formStartFired`, `contactInfoCaptured`, `activeObservers`)
- `sendToParent()` still calls `isQuoteMode()` and `addBookingTypeToEvent()` — verify those functions are present
- `init()` does NOT call `setupEcommerceListeners()`

```bash
# Should return NO matches for removed functions:
grep -n 'setupEcommerceListeners\|observeForElement\|cleanupObserver\|sha256\|normalizeEmail\|normalizePhone\|normalizeName\|collectUserData\|getHashedUserData\|fireContactInfoEvent\|getFormData\|parsePrice\|getVehicleFromCard\|getAllVehicles\|getVehicleData\|getCheckoutData\|selectedVehicle\|formStartFired\|contactInfoCaptured\|activeObservers' standard/gtm-sender-tag.html

# Should return matches for kept functions:
grep -n 'sendToParent\|isQuoteMode\|addBookingTypeToEvent\|getBookingType\|interceptDataLayer\|protectDataLayer\|setupHeightObserver\|sendHeight\|isInIframe\|identifyEventType\|normalizeEventData' standard/gtm-sender-tag.html
```

Expected: first grep returns nothing, second returns multiple matches.

**Step 3: Commit**

```bash
git add standard/gtm-sender-tag.html
git commit -m "feat: create standard sender (purchase + quote + GCLID + height)"
```

---

### Task 4: Create Standard Receiver

Fork `parent-receiver.js` into `standard/parent-receiver.js`. The only functional change is reducing `GA4_EVENTS` to just `purchase` and `generate_lead`.

**Files:**
- Create: `standard/parent-receiver.js`
- Reference: `parent-receiver.js` (source to fork from)

**Step 1: Copy and modify**

Copy `parent-receiver.js` to `standard/parent-receiver.js`, then make these changes:

1. Update JSDoc title (line 3): `Limo Anywhere dataLayer Bridge - Parent Receiver (Standard)`
2. Update section header (line 38): `LA DATALAYER BRIDGE - PARENT RECEIVER (STANDARD)`
3. Replace `GA4_EVENTS` (lines 119-131) with:

```javascript
  var GA4_EVENTS = {
    'purchase': { name: 'purchase', params: ['transaction_id', 'value', 'currency', 'items', 'coupon', 'shipping', 'tax', 'booking_type', 'is_quote'] },
    'generate_lead': { name: 'generate_lead', params: ['value', 'currency', 'lead_source', 'transaction_id', 'booking_type', 'is_quote'] }
  };
```

Everything else stays identical — mode resolution, origin validation, deduplication, height handling, `fireGtag`, `fireDataLayer`, `handleEvent`, `onMessage`, `init`.

**Step 2: Verify the diff is minimal**

```bash
diff parent-receiver.js standard/parent-receiver.js
```

Expected: only the header lines and GA4_EVENTS block differ.

**Step 3: Verify unknown events still pass through**

The receiver's `fireGtag()` function (line 149-152) already handles events NOT in `GA4_EVENTS` with a fallback `Object.assign`. So if the Advanced sender somehow sends a `form_start` event to a Standard receiver, it would still pass through. This is fine — the Standard sender simply won't send those events.

**Step 4: Commit**

```bash
git add standard/parent-receiver.js
git commit -m "feat: create standard receiver (purchase + generate_lead only)"
```

---

### Task 5: Generate Minified Files

There is no build system. Minified files in `min/` are maintained manually. Use an external minifier (Terser, UglifyJS, or an online tool) to generate minified versions.

**Files:**
- Create: `standard/min/parent-receiver.min.js`
- Create: `standard/min/gtm-sender.min.js`
- Create: `standard/min/gtm-sender.min.html`

**Step 1: Install terser (if not already available)**

```bash
npx terser --version
```

If not available, use any JS minifier. The original minified files appear to have been generated with a bundler/minifier that preserves the IIFE structure.

**Step 2: Minify Standard sender JS**

Extract the JS from `standard/gtm-sender-tag.html` (everything between `<script>` and `</script>` tags), minify it, then create both `gtm-sender.min.js` (JS only) and `gtm-sender.min.html` (wrapped in `<script>` tags).

```bash
# Extract JS from HTML
sed -n '/<script>/,/<\/script>/p' standard/gtm-sender-tag.html | sed '1d;$d' > /tmp/standard-sender.js

# Minify
npx terser /tmp/standard-sender.js -c -m -o standard/min/gtm-sender.min.js

# Wrap in script tags
echo '<script>' > standard/min/gtm-sender.min.html
cat standard/min/gtm-sender.min.js >> standard/min/gtm-sender.min.html
echo '</script>' >> standard/min/gtm-sender.min.html
```

**Step 3: Minify Standard receiver**

```bash
# Strip the leading JSDoc comment (everything before the IIFE), then minify
npx terser standard/parent-receiver.js -c -m -o standard/min/parent-receiver.min.js
```

**Step 4: Verify minified files work**

Check that minified files:
- Contain `LADB-2026-EDLEY-7X9K2` (bridge ID preserved)
- Do NOT contain removed function names (sanity check)
- Are smaller than the source files

```bash
wc -c standard/gtm-sender-tag.html standard/min/gtm-sender.min.html
wc -c standard/parent-receiver.js standard/min/parent-receiver.min.js
grep -c 'LADB-2026-EDLEY-7X9K2' standard/min/gtm-sender.min.js standard/min/parent-receiver.min.js
```

**Step 5: Commit**

```bash
git add standard/min/
git commit -m "chore: generate standard tier minified files"
```

---

### Task 6: Decide Root File Fate and Update Documentation

The original root-level files (`gtm-sender-tag.html`, `parent-receiver.js`, `min/`) now have copies in `advanced/`. Decide whether to keep root files as-is (backwards compatibility) or remove them.

**Recommendation:** Keep root files as-is for now. They serve as the "current" version for anyone who cloned the repo before the tier split. The README will explain the new structure.

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: Update README.md**

Add a section after "Quick Start" explaining the tier structure. Add a tier comparison table. Update the Files table to reflect the new layout.

Key additions:
- Tier overview table (Standard vs Advanced features)
- Updated file layout showing `standard/` and `advanced/` directories
- Note that root-level files are the legacy/Advanced version

**Step 2: Update CLAUDE.md**

Update the File Layout section to reflect `standard/` and `advanced/` directories. Add a note about tier separation to the Architecture section.

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document standard vs advanced tier structure"
```

---

## Summary

| Task | What | Commit |
|------|------|--------|
| 1 | Create directory structure | `chore: create standard and advanced tier directories` |
| 2 | Copy current files to advanced/ with tier label | `feat: create advanced tier from current source files` |
| 3 | Write standard sender (stripped-down fork) | `feat: create standard sender (purchase + quote + GCLID + height)` |
| 4 | Write standard receiver (reduced GA4_EVENTS) | `feat: create standard receiver (purchase + generate_lead only)` |
| 5 | Generate minified files for standard | `chore: generate standard tier minified files` |
| 6 | Update README and CLAUDE.md | `docs: document standard vs advanced tier structure` |
