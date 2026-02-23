# Tier Separation Design: Standard vs Advanced

## Goal

Split the monolithic bridge into two separate file sets so the product team can sell Standard (purchase conversions) and Advanced (full funnel + Enhanced Conversions) as distinct tiers.

## Tier Definitions

### Standard — Purchase Conversion Tracking

Tracks completed bookings and quote submissions with Google Ads attribution.

**Events:**
- `purchase` — booking completed (both ORES formats: GA4-style gtag and legacy transactionId/transactionTotal)
- `generate_lead` — quote submission (replaces purchase when quote mode detected, value: 0)

**Features:**
- Quote vs reservation detection (`#BookType` hidden input, button text/onclick signals)
- `booking_type` / `is_quote` params on all events
- GCLID preservation (gtag mode with auto-detect measurement ID)
- Iframe auto-height resize (ResizeObserver + requestAnimationFrame throttling)
- Origin validation and event deduplication
- Auto/gtag/dataLayer mode resolution
- `data-*` attribute configuration on script tag

### Advanced — Full Funnel + Enhanced Conversions

Everything in Standard, plus the complete booking funnel and hashed PII for Google Ads attribution.

**Additional events:**
- `form_start` — first interaction with booking form fields
- `view_item_list` — vehicles appear after validation passes (MutationObserver-based)
- `select_item` — user clicks "Book Now" on a vehicle
- `add_contact_info` — user enters email or phone
- `begin_checkout` — user clicks "Continue as guest"
- `add_payment_info` — user selects payment method

**Additional features:**
- Enhanced Conversions (SHA-256 hashed email, phone, first/last name on `add_contact_info`, `begin_checkout`, `add_payment_info`)
- `form_data` payload on checkout/payment events (service type, pickup, dropoff, date, time)
- Vehicle item data (name, price, category) on ecommerce events

## File Structure

```
standard/
  gtm-sender-tag.html
  parent-receiver.js
  min/
    gtm-sender.min.html
    gtm-sender.min.js
    parent-receiver.min.js

advanced/
  gtm-sender-tag.html
  parent-receiver.js
  min/
    gtm-sender.min.html
    gtm-sender.min.js
    parent-receiver.min.js
```

Current root-level files become the Advanced version (they already contain everything). Standard is a stripped-down fork.

## Standard Sender — What to Keep

From `gtm-sender-tag.html`, the Standard sender keeps:

- IIFE wrapper, version constants, license watermark
- `isInIframe()`, `identifyEventType()`, `normalizeEventData()`
- `sendToParent()` with quote detection branch (generate_lead instead of purchase)
- `interceptDataLayer()` + `protectDataLayer()` — captures purchase events from ORES
- Quote detection: `getBookingType()`, `isQuoteMode()`, `addBookingTypeToEvent()`, `cachedBookingType`
- Height sending: `sendHeight()`, `scheduleHeightUpdate()`, `setupHeightObserver()`
- `init()` — calls interceptDataLayer, protectDataLayer, setupHeightObserver (no setupEcommerceListeners)

## Standard Sender — What to Remove

- `setupEcommerceListeners()` and all its sub-handlers (click, change, focus, blur)
- `observeForElement()`, `cleanupObserver()`, `activeObservers` (MutationObserver helpers)
- `sha256()`, `normalizeEmail()`, `normalizePhone()`, `normalizeName()` (Enhanced Conversions hashing)
- `collectUserData()`, `getHashedUserData()`, `fireContactInfoEvent()`, `contactInfoCaptured`
- `getFormData()`, `getVehicleFromCard()`, `getAllVehicles()`, `getVehicleData()`, `getCheckoutData()`
- `selectedVehicle`, `formStartFired` state variables

## Standard Receiver — Changes

- `GA4_EVENTS` map reduced to `purchase` and `generate_lead` only
- All other receiver logic stays the same (mode resolution, origin validation, deduplication, height handling, gtag/dataLayer firing)

## Advanced Receiver — No Changes

The current `parent-receiver.js` already handles all events. It becomes the Advanced receiver as-is.

## Shared Behavior (Both Tiers)

- Version constants (`_LA_BRIDGE_ID`, `_LA_BRIDGE_VERSION`, `_LA_BRIDGE_BUILD`) stay in sync across all files
- Same `postMessage` protocol: `LA_DATALAYER_EVENT` and `LA_IFRAME_HEIGHT` message types
- Same configuration via `data-*` attributes
- Same mode resolution logic (auto/gtag/dataLayer)
- Same origin validation and deduplication
- `_debug_only` flag behavior for debug-mode init events
