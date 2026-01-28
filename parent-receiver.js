/**
 * Limo Anywhere dataLayer Bridge - Parent Receiver
 *
 * Receives events from the Limo Anywhere booking widget (iframe) and fires
 * them to GA4 on the parent page. Preserves GCLID attribution from Google Ads.
 * Also handles automatic iframe height resizing to eliminate scrollbars.
 *
 * INSTALLATION:
 * Add to your page with data attributes for configuration:
 *
 *   <script
 *     data-la-bridge
 *     data-measurement-id="G-XXXXXXXXXX"
 *     data-debug="false"
 *     src="parent-receiver.js"
 *   ></script>
 *
 * Or inline the script with data attributes on the script tag.
 *
 * OPTIONS:
 *   data-la-bridge            (required) Marker to identify the script
 *   data-measurement-id       GA4 Measurement ID (auto-detects if omitted)
 *   data-mode                 "auto" | "gtag" | "dataLayer" (default: "auto")
 *   data-event-prefix         Prefix for dataLayer events (default: "la_")
 *   data-allowed-origins      Comma-separated origins (default: "https://book.mylimobiz.com")
 *   data-debug                "true" to enable console logging
 *
 * HEIGHT RESIZE OPTIONS:
 *   data-iframe-selector      CSS selector for iframe (default: 'iframe[src*="book.mylimobiz.com"]')
 *   data-min-height           Minimum iframe height in px (default: 400)
 *   data-max-height           Maximum iframe height in px (default: 2000)
 *   data-enable-height-resize "false" to disable auto height (default: enabled)
 */
(function() {
  'use strict';

  // ========================================
  // LA DATALAYER BRIDGE - PARENT RECEIVER
  // Copyright 2026 Brandon Edley. All Rights Reserved.
  // Licensed for Limo Anywhere ORES integrations only.
  // ========================================
  var _LA_BRIDGE_ID = 'LADB-2026-EDLEY-7X9K2';
  var _LA_BRIDGE_VERSION = '1.1.0';
  var _LA_BRIDGE_BUILD = '20260128';
  var _w = 'Q29weXJpZ2h0IDIwMjYgQnJhbmRvbiBFZGxleS4gTGljZW5zZWQgZm9yIExBIE9SRVMgb25seS4=';

  // Find our script tag and read configuration
  var script = document.currentScript || document.querySelector('script[data-la-bridge]');

  if (!script) {
    console.error('[LA-Bridge] Could not find script element. Add data-la-bridge attribute.');
    return;
  }

  var config = {
    measurementId: script.dataset.measurementId || null,
    mode: script.dataset.mode || 'auto',
    eventPrefix: script.dataset.eventPrefix || 'la_',
    allowedOrigins: (script.dataset.allowedOrigins || 'https://book.mylimobiz.com').split(',').map(function(s) { return s.trim(); }),
    debug: script.dataset.debug === 'true',
    // Height auto-resize configuration
    iframeSelector: script.dataset.iframeSelector || 'iframe[src*="book.mylimobiz.com"]',
    minHeight: parseInt(script.dataset.minHeight, 10) || 400,
    maxHeight: parseInt(script.dataset.maxHeight, 10) || 2000,
    enableHeightResize: script.dataset.enableHeightResize !== 'false' // enabled by default
  };

  function log() {
    if (config.debug) {
      var args = ['[LA-Bridge]'].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    }
  }

  log('Config loaded:', config);

  // Resolve mode and measurement ID
  var resolvedMode = config.mode;
  var resolvedMeasurementId = config.measurementId;

  function detectMeasurementId() {
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      for (var i = 0; i < window.dataLayer.length; i++) {
        var item = window.dataLayer[i];
        if (item && item['0'] === 'config' && typeof item['1'] === 'string' && item['1'].startsWith('G-')) {
          return item['1'];
        }
      }
    }
    if (window.google_tag_data && window.google_tag_data.tidr) {
      var ids = Object.keys(window.google_tag_data.tidr);
      for (var j = 0; j < ids.length; j++) {
        if (ids[j].startsWith('G-')) {
          return ids[j];
        }
      }
    }
    return null;
  }

  function resolveMode() {
    if (config.mode === 'gtag' || config.mode === 'dataLayer') {
      resolvedMode = config.mode;
    } else {
      if (config.measurementId) {
        resolvedMode = 'gtag';
      } else if (typeof window.gtag === 'function') {
        resolvedMode = 'gtag';
        resolvedMeasurementId = detectMeasurementId();
      } else {
        resolvedMode = 'dataLayer';
      }
    }
    log('Resolved mode:', resolvedMode, 'Measurement ID:', resolvedMeasurementId || '(auto)');
  }

  // GA4 ecommerce events
  // Note: booking_type and is_quote are included for quote vs reservation tracking
  var GA4_EVENTS = {
    'purchase': { name: 'purchase', params: ['transaction_id', 'value', 'currency', 'items', 'coupon', 'shipping', 'tax', 'booking_type', 'is_quote'] },
    'begin_checkout': { name: 'begin_checkout', params: ['value', 'currency', 'items', 'coupon', 'booking_type', 'is_quote'] },
    'add_to_cart': { name: 'add_to_cart', params: ['value', 'currency', 'items', 'booking_type', 'is_quote'] },
    'view_item': { name: 'view_item', params: ['value', 'currency', 'items', 'booking_type', 'is_quote'] },
    'view_item_list': { name: 'view_item_list', params: ['item_list_id', 'item_list_name', 'items', 'booking_type', 'is_quote'] },
    'select_item': { name: 'select_item', params: ['item_list_id', 'item_list_name', 'items', 'value', 'currency', 'booking_type', 'is_quote'] },
    'add_payment_info': { name: 'add_payment_info', params: ['value', 'currency', 'payment_type', 'items', 'coupon', 'booking_type', 'is_quote'] },
    'add_shipping_info': { name: 'add_shipping_info', params: ['value', 'currency', 'shipping_tier', 'items', 'coupon', 'booking_type', 'is_quote'] },
    'add_contact_info': { name: 'add_contact_info', params: ['booking_type', 'is_quote'] },
    'form_start': { name: 'form_start', params: ['form_id', 'form_name', 'form_destination', 'first_field'] },
    'generate_lead': { name: 'generate_lead', params: ['value', 'currency', 'lead_source', 'transaction_id', 'booking_type', 'is_quote'] }
  };

  function fireGtag(eventName, data) {
    if (typeof window.gtag !== 'function') {
      log('gtag not available, falling back to dataLayer');
      fireDataLayer(eventName, data);
      return false;
    }

    var params = {};
    var eventConfig = GA4_EVENTS[eventName];

    if (eventConfig) {
      eventConfig.params.forEach(function(param) {
        if (data[param] !== undefined) {
          params[param] = data[param];
        }
      });
    } else {
      params = Object.assign({}, data);
      delete params.event;
    }

    if (resolvedMeasurementId) {
      params.send_to = resolvedMeasurementId;
    }

    log('Firing gtag:', eventName, params);

    try {
      window.gtag('event', eventName, params);
      return true;
    } catch (e) {
      log('gtag error:', e);
      fireDataLayer(eventName, data);
      return false;
    }
  }

  function fireDataLayer(eventName, data) {
    window.dataLayer = window.dataLayer || [];

    var prefixedEvent = config.eventPrefix + eventName;
    var payload = { event: prefixedEvent };

    Object.keys(data).forEach(function(key) {
      if (key !== 'event') {
        payload[config.eventPrefix + key] = data[key];
      }
    });

    log('Pushing to dataLayer:', payload);
    window.dataLayer.push(payload);
    return true;
  }

  function handleEvent(eventName, data) {
    log('Handling event:', eventName, data);

    // Debug-only events go to dataLayer only, skip gtag
    if (data && data._debug_only) {
      delete data._debug_only;  // Remove flag before pushing
      return fireDataLayer(eventName, data);
    }

    if (resolvedMode === 'gtag') {
      return fireGtag(eventName, data);
    } else {
      return fireDataLayer(eventName, data);
    }
  }

  // ========================================
  // IFRAME HEIGHT HANDLER
  // ========================================

  var cachedIframe = null;

  function findIframe() {
    if (cachedIframe && document.contains(cachedIframe)) {
      return cachedIframe;
    }
    cachedIframe = document.querySelector(config.iframeSelector);
    return cachedIframe;
  }

  function handleHeightMessage(height) {
    if (!config.enableHeightResize) {
      log('Height resize disabled, ignoring height:', height);
      return;
    }

    var iframe = findIframe();
    if (!iframe) {
      log('No iframe found with selector:', config.iframeSelector);
      return;
    }

    // Clamp height to min/max bounds
    var clampedHeight = Math.max(config.minHeight, Math.min(config.maxHeight, height));

    // Apply height to iframe
    iframe.style.height = clampedHeight + 'px';
    log('Updated iframe height:', clampedHeight, '(raw:', height + ')');
  }

  // Message listener
  var receivedEventIds = {};

  function isOriginAllowed(origin) {
    if (config.allowedOrigins.indexOf('*') !== -1) {
      return true;
    }
    return config.allowedOrigins.indexOf(origin) !== -1;
  }

  function onMessage(event) {
    if (!isOriginAllowed(event.origin)) {
      return;
    }

    var message = event.data;
    if (!message || !message.type) {
      return;
    }

    // Handle height messages
    if (message.type === 'LA_IFRAME_HEIGHT') {
      if (typeof message.height === 'number' && message.height > 0) {
        handleHeightMessage(message.height);
      }
      return;
    }

    // Handle dataLayer event messages
    if (message.type !== 'LA_DATALAYER_EVENT') {
      return;
    }

    var payload = message.payload;
    if (!payload || !payload.eventName) {
      log('Invalid payload:', message);
      return;
    }

    if (payload.eventName.startsWith('gtm.')) {
      return;
    }

    // Deduplication
    var eventId = payload.timestamp + '_' + payload.eventName;
    if (receivedEventIds[eventId]) {
      log('Duplicate event skipped:', payload.eventName);
      return;
    }
    receivedEventIds[eventId] = true;

    // Clean up old event IDs
    var eventIds = Object.keys(receivedEventIds);
    if (eventIds.length > 100) {
      delete receivedEventIds[eventIds[0]];
    }

    log('Received from', event.origin + ':', payload.eventName);
    handleEvent(payload.eventName, payload.data || {});
  }

  // Initialize
  function init() {
    resolveMode();
    window.addEventListener('message', onMessage, false);
    log('Receiver initialized. Listening for events from:', config.allowedOrigins.join(', '));

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: config.eventPrefix + 'bridge_ready',
      la_bridge_mode: resolvedMode,
      la_bridge_measurement_id: resolvedMeasurementId || 'auto'
    });
  }

  init();

})();
