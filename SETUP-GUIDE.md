# Limo Anywhere dataLayer Bridge - Setup Guide

Complete step-by-step instructions for setting up the analytics bridge.

---

## Prerequisites

- [ ] Access to Google Tag Manager for the **widget domain** (book.mylimobiz.com)
- [ ] Access to edit your website where the widget is embedded
- [ ] GA4 property set up on your domain

---

## Part 1: Deploy the GTM Sender Tag (Widget Side)

### Step 1: Open Google Tag Manager

1. Go to [tagmanager.google.com](https://tagmanager.google.com)
2. Select the GTM container for `book.mylimobiz.com`
   - Container ID format: `GTM-XXXXXXX`

### Step 2: Create New Tag

1. Click **Tags** in the left sidebar
2. Click **New** button
3. Name the tag: `LA Bridge - Widget Sender`

### Step 3: Configure Tag

1. Click **Tag Configuration**
2. Select **Custom HTML**
3. Copy the **entire contents** of `gtm-sender-tag.html`
4. Paste into the HTML field

### Step 4: Configure Trigger

1. Click **Triggering**
2. Click the **+** icon to add a new trigger
3. Click **+** again to create new trigger
4. Name it: `DOM Ready - All Pages`
5. Select trigger type: **DOM Ready**
6. Set "This trigger fires on": **All Pages**
7. Save the trigger

### Step 5: Set Tag Priority

1. In the tag editor, click **Advanced Settings**
2. Set **Tag firing priority**: `1`
   - This ensures the bridge loads before other tags

### Step 6: Save and Publish

1. Click **Save**
2. Click **Submit** (top right)
3. Add version name: `LA Bridge Sender v1.0`
4. Click **Publish**

---

## Part 2: Add the Parent Receiver (Your Website)

### Option A: Script Tag (Recommended)

Add this to your page `<head>` or before the closing `</body>`:

```html
<!-- Limo Anywhere Analytics Bridge -->
<script
  data-la-bridge
  data-measurement-id="G-XXXXXXXXXX"
  src="https://yourcdn.com/parent-receiver.js"
></script>
```

Replace:
- `G-XXXXXXXXXX` with your GA4 Measurement ID
- Update the `src` to where you host the file

### Option B: Inline Script

Copy the contents of `parent-receiver.js` and add directly to your page:

```html
<!-- Limo Anywhere Analytics Bridge -->
<script data-la-bridge data-measurement-id="G-XXXXXXXXXX">
  // Paste contents of parent-receiver.js here
</script>
```

---

## Part 3: Verify Installation

### Test 1: Check Bridge Initialization

1. Open your page with the embedded widget
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for: `[LA-Bridge] Receiver initialized`

### Test 2: Test Event Flow

1. In the widget, click on the date picker
2. Check console for: `form_start` event
3. Fill out the form and click "Select Vehicle"
4. Check console for: `view_item_list` event (only fires if validation passes)
5. Click "Book Now" on a vehicle
6. Check console for: `select_item` event
7. Enter contact info (email, phone)
8. Check console for: `add_contact_info` event with `user_data`
9. Click "Continue as guest"
10. Check console for: `begin_checkout` event with `user_data`

### Test 3: Verify in GA4 DebugView

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property
3. Go to **Admin** → **DebugView**
4. Complete a booking flow
5. Verify events appear:
   - `form_start`
   - `view_item_list`
   - `select_item`
   - `begin_checkout`
   - `add_payment_info`
   - `purchase`

---

## Configuration Reference

### Parent Receiver Data Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-la-bridge` | ✅ | - | Required marker |
| `data-measurement-id` | | Auto | GA4 ID (e.g., `G-ABC123`) |
| `data-mode` | | `auto` | `auto`, `gtag`, or `dataLayer` |
| `data-event-prefix` | | `la_` | Prefix for dataLayer events |
| `data-allowed-origins` | | `https://book.mylimobiz.com` | Allowed iframe origins |
| `data-debug` | | `false` | Enable console logging |

### Example Configurations

**Minimal:**
```html
<script data-la-bridge src="parent-receiver.js"></script>
```

**With Debug:**
```html
<script
  data-la-bridge
  data-measurement-id="G-ABC123XYZ"
  data-debug="true"
  src="parent-receiver.js"
></script>
```

**Multiple Origins:**
```html
<script
  data-la-bridge
  data-measurement-id="G-ABC123XYZ"
  data-allowed-origins="https://book.mylimobiz.com,https://book.limoanywhere.com"
  src="parent-receiver.js"
></script>
```

---

## Troubleshooting

### No events appearing

**Check GTM is published:**
- Go to GTM → Versions
- Verify latest version is published
- Wait 1-2 minutes for CDN propagation

**Check iframe is loading:**
- Right-click the widget → Inspect
- Verify iframe src is `book.mylimobiz.com`

**Enable debug mode:**
```html
<script data-la-bridge data-debug="true" ...>
```

### No events appearing (debug mode)

With `data-debug="true"` set, you should see `la_bridge_init` in the console and dataLayer. If not:
1. Verify sender tag is published in GTM
2. Clear browser cache (Ctrl+Shift+R)
3. Wait 60 seconds for GTM CDN

**Note:** `la_bridge_init` only fires in debug mode and goes to dataLayer only (not GA4).

### Events fire but not in GA4

**Check:**
1. Measurement ID is correct
2. gtag.js is loaded on the page
3. No ad blockers interfering

### GCLID not being tracked

**Ensure:**
1. User arrived via Google Ads click
2. `_gcl_aw` cookie exists on your domain
3. Receiver is using `gtag` mode (not `dataLayer`)

---

## Events Reference

| Event | Trigger | GA4 Report | Enhanced Conversions |
|-------|---------|------------|---------------------|
| `form_start` | First form field interaction | Events | - |
| `view_item_list` | Vehicles appear (validation passes) | Ecommerce | - |
| `select_item` | Click "Book Now" on vehicle | Ecommerce | - |
| `add_contact_info` | Enter email or phone | Events | ✅ `user_data` |
| `begin_checkout` | Click "Continue as guest" | Ecommerce | ✅ `user_data` |
| `add_payment_info` | Select payment method | Ecommerce | ✅ `user_data` |
| `purchase` | Booking completed | Ecommerce | - |

## Enhanced Conversions

The bridge automatically hashes user contact data (email, phone, name) for Google Enhanced Conversions. This improves conversion attribution when cookies are blocked.

### user_data Object

Events with Enhanced Conversions include:

```json
{
  "user_data": {
    "sha256_email_address": "hash...",
    "sha256_phone_number": "hash...",
    "sha256_first_name": "hash...",
    "sha256_last_name": "hash..."
  }
}
```

### Enable in Google Ads

1. Go to Google Ads → Tools → Conversions
2. Select your conversion action
3. Enable "Enhanced conversions"
4. Choose "Google tag" as the implementation method
5. The bridge automatically provides the hashed data

---

## Support

For technical issues, check:
1. Browser console for errors
2. Network tab for blocked requests
3. GTM Preview mode for tag firing

Need help? Contact your implementation team.
