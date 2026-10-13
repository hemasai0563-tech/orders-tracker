// ==============================================================================
// RAD Retail & Fleet Command - Service Worker (Lock-Screen & Background Alerts)
// ==============================================================================
const CACHE_NAME = 'rad-fleet-sw-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Handle clicking notifications or action buttons on device lock screen / status bar
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetInvoice = event.notification.data ? event.notification.data.invoiceNo : null;
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetInvoice) {
            client.postMessage({
              type: action === 'accept' ? 'ACCEPT_DELIVERY_ORDER' : 'FOCUS_DELIVERY_ORDER',
              invoiceNo: targetInvoice
            });
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
        vibrate: [500, 200, 500, 200, 800, 200, 500, 200, 800],
        requireInteraction: true,
        tag: data.tag || 'delivery-order',
        renotify: true,
        data: data,
        actions: [
          { action: 'accept', title: '🚀 Accept & Ride' },
          { action: 'view', title: '👁️ Open Order' }
        ]
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.warn('Error displaying push notification:', e);
    }
  }
});
