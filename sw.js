// ==============================================================================
// RAD Retail & Fleet Command - Service Worker (Lock-Screen & Background Alerts)
// ==============================================================================
const CACHE_NAME = 'rad-fleet-sw-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Handle clicking notifications on device lock screen or status bar
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetInvoice = event.notification.data ? event.notification.data.invoiceNo : null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetInvoice) {
            client.postMessage({ type: 'FOCUS_DELIVERY_ORDER', invoiceNo: targetInvoice });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// Listen for push events (if backend pushes directly)
self.addEventListener('push', event => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || '🚨 NEW DELIVERY ALLOCATED!';
      const options = {
        body: data.body || 'A new delivery order has arrived.',
        icon: 'logo.png',
        badge: 'logo.png',
        vibrate: [400, 150, 400, 150, 600],
        requireInteraction: true,
        tag: data.tag || 'delivery-order',
        renotify: true,
        data: data
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.warn('Error displaying push notification:', e);
    }
  }
});
