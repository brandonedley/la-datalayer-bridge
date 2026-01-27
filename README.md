# Limo Anywhere dataLayer Bridge

Bridge analytics events from the Limo Anywhere booking widget (iframe) to your parent page for unified GA4 tracking.

## Overview

When embedding the Limo Anywhere widget (`book.mylimobiz.com`) in an iframe, analytics events are isolated in the iframe's context. This bridge captures those events and forwards them to your parent page via `postMessage`, allowing you to:

- Track the complete booking funnel in YOUR GA4 property
- Preserve GCLID attribution from Google Ads
- Fire conversion events from your domain

## Quick Start

### 1. Add the Parent Receiver to Your Page

Add this script to any page that embeds the Limo Anywhere widget:

**Option A: External script (recommended)**
```html
<!-- Limo Anywhere dataLayer Bridge - Parent Receiver -->
<script
  data-la-bridge
  data-measurement-id="G-XXXXXXXXXX"
  src="https://yourcdn.com/parent-receiver.js"
></script>
```

**Option B: Inline script (paste directly)**
```html
<!-- Limo Anywhere dataLayer Bridge - Parent Receiver -->
<script data-la-bridge data-measurement-id="G-XXXXXXXXXX">
// Paste the contents of parent-receiver.js here
// (or use min/parent-receiver.min.js for smaller size)
</script>
```

Both options work identically. Inline is useful when you can't host external scripts or want everything in one place.

### 2. Deploy the Sender Tag to GTM

1. Open Google Tag Manager
2. Go to the GTM container for your **widget domain** (book.mylimobiz.com)
3. Create a new **Custom HTML** tag
4. Paste the contents of `gtm-sender-tag.html`
5. Set trigger: **DOM Ready - All Pages**
6. Set Tag Firing Priority: **1** (fires before other tags)
7. Save and publish

## Configuration Options

### Parent Receiver Options

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-la-bridge` | Yes | - | Marker to identify the script |
| `data-measurement-id` | No | Auto-detect | GA4 Measurement ID (e.g., `G-XXXXXXXXXX`) |
| `data-mode` | No | `auto` | `auto`, `gtag`, or `dataLayer` |
| `data-event-prefix` | No | `la_` | Prefix for dataLayer events |
| `data-allowed-origins` | No | `https://book.mylimobiz.com` | Comma-separated allowed origins |
| `data-debug` | No | `false` | Enable console logging |

### Examples

**Minimal (auto-detect GA4):**
```html
<script data-la-bridge src="parent-receiver.js"></script>
```

**With explicit GA4 ID:**
```html
<script
  data-la-bridge
  data-measurement-id="G-ABC123XYZ"
  src="parent-receiver.js"
></script>
```

**Full configuration:**
```html
<script
  data-la-bridge
  data-measurement-id="G-ABC123XYZ"
  data-mode="gtag"
  data-allowed-origins="https://book.mylimobiz.com,https://book.limoanywhere.com"
  data-debug="true"
  src="parent-receiver.js"
></script>
```

## Events Tracked

| Event | Trigger | GA4 Ecommerce | Enhanced Conversions |
|-------|---------|---------------|---------------------|
| `form_start` | User clicks on date/time/location field | No (custom) | No |
| `view_item_list` | Vehicles appear after validation passes | Yes | No |
| `select_item` | User clicks "Book Now" on a vehicle | Yes | No |
| `add_contact_info` | User enters email or phone | No (custom) | ✅ Yes |
| `begin_checkout` | User clicks "Continue as guest" | Yes | ✅ Yes |
| `add_payment_info` | User selects payment method | Yes | ✅ Yes |
| `purchase` | Booking completed | Yes | No |

> **Note**: `view_item_list` uses MutationObserver to detect when vehicles actually appear, ensuring the event only fires when form validation passes.

## Event Data Examples

### form_start
```json
{
  "event": "form_start",
  "form_id": "booking_form",
  "form_name": "Limo Booking Form",
  "first_field": "PickUpDate"
}
```

### view_item_list
```json
{
  "event": "view_item_list",
  "item_list_id": "vehicles",
  "item_list_name": "Available Vehicles",
  "items": [
    {
      "item_id": "sedan_towncar",
      "item_name": "Sedan Towncar",
      "item_category": "Vehicle",
      "price": 217.44,
      "quantity": 1
    }
  ]
}
```

### select_item
```json
{
  "event": "select_item",
  "currency": "USD",
  "value": 217.44,
  "items": [
    {
      "item_id": "sedan_towncar",
      "item_name": "Sedan Towncar",
      "item_category": "Vehicle",
      "price": 217.44,
      "quantity": 1
    }
  ]
}
```

### add_contact_info
```json
{
  "event": "add_contact_info",
  "user_data": {
    "sha256_email_address": "a1b2c3d4e5f6...",
    "sha256_phone_number": "g7h8i9j0k1l2...",
    "sha256_first_name": "m3n4o5p6q7r8...",
    "sha256_last_name": "s9t0u1v2w3x4..."
  }
}
```

### begin_checkout
```json
{
  "event": "begin_checkout",
  "currency": "USD",
  "value": 217.44,
  "items": [
    {
      "item_id": "sedan_towncar",
      "item_name": "Sedan Towncar",
      "price": 217.44
    }
  ],
  "form_data": {
    "service_type": "Point-to-Point",
    "pickup": "DFW Airport",
    "dropoff": "Downtown Dallas",
    "date": "01/30/2026",
    "time": "15:00"
  },
  "user_data": {
    "sha256_email_address": "a1b2c3d4e5f6...",
    "sha256_phone_number": "g7h8i9j0k1l2..."
  }
}
```

### purchase
```json
{
  "event": "purchase",
  "transaction_id": "14887",
  "currency": "USD",
  "value": 217.44
}
```

## Enhanced Conversions

The bridge automatically collects user contact information and hashes it with SHA-256 for [Google Enhanced Conversions](https://support.google.com/google-ads/answer/9888656). This improves conversion attribution when:

- Third-party cookies are blocked
- Users clear cookies between ad click and conversion
- Cross-device conversions occur

### What Data is Collected

| Field | Source | Normalization |
|-------|--------|---------------|
| Email | `#Passenger_Email` | Lowercase, trim, gmail dot-removal |
| Phone | `#Passenger_Phone` | E.164 format (+1XXXXXXXXXX) |
| First Name | `#Passenger_FirstName` | Lowercase, trim |
| Last Name | `#Passenger_LastName` | Lowercase, trim |

All data is hashed client-side before transmission - no PII leaves the browser unhashed.

### GA4/Google Ads Setup

1. Enable Enhanced Conversions in Google Ads
2. Link GA4 to Google Ads
3. The `user_data` object is automatically included in events

## Files

| File | Purpose | Where to install |
|------|---------|------------------|
| `parent-receiver.js` | Receives events on parent page | Your website (script tag on page) |
| `gtm-sender-tag.html` | Sends events from widget (full source) | GTM Custom HTML (widget domain) |
| `min/gtm-sender.min.html` | Minified sender (59% smaller) | GTM Custom HTML (alternative) |
| `min/gtm-sender.min.js` | Minified JS only | CDN hosting |

## Troubleshooting

### Events not appearing

1. **Check GTM is published**: Ensure the sender tag is published, not just saved
2. **Wait for cache**: GTM can take 30-60 seconds to propagate
3. **Enable debug mode**: Set `data-debug="true"` on the receiver
4. **Check console**: Look for `[LA-Bridge]` messages

### Events not firing (but debug works)

If `la_bridge_init` appears in debug mode but no other events fire:
- GTM container has the latest version published
- Widget page is fully loaded before interactions
- Form validation may be failing (check `view_item_list` requires valid form)

**Note:** `la_bridge_init` only fires when `data-debug="true"` and goes to dataLayer only (not GA4).

### GCLID not tracking

Ensure:
- Parent page has gtag.js loaded with your GA4 ID
- User arrived via a Google Ads click (check for `gclid` in URL)
- Receiver is using `gtag` mode (auto-detects if gtag exists)

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ Parent Page (yourdomain.com)                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ iframe (book.mylimobiz.com)                             │   │
│  │                                                         │   │
│  │  GTM Sender Tag                                         │   │
│  │    ├── Intercepts dataLayer.push()                      │   │
│  │    ├── Listens for click events                         │   │
│  │    └── Sends via postMessage ──────────────────────┐    │   │
│  │                                                    │    │   │
│  └────────────────────────────────────────────────────┼────┘   │
│                                                       │         │
│  Parent Receiver                                      │         │
│    ├── Receives postMessage ◄─────────────────────────┘         │
│    ├── Validates origin                                         │
│    └── Fires gtag('event', ...) or dataLayer.push()            │
│                                                                 │
│  GA4 (yourdomain.com)                                          │
│    └── Receives events with YOUR measurement ID                │
│    └── Preserves GCLID attribution ✓                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Roadmap

- [ ] **Quote flow detection** - Detect and track quote requests separately from bookings with pricing. Some ORES configurations don't show prices (operator choice or no matching rates), resulting in quote/lead submissions rather than priced bookings. Need to analyze the widget to identify distinguishing signals.

## Support

For issues or questions, contact your implementation team.
