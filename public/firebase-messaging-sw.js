// Firebase messaging service worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase (use the same config as in your main app)
const firebaseConfig = {
  apiKey: "AIzaSyBOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxxxxxxxxxx"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || payload.data?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    image: payload.notification?.image || payload.data?.image,
    tag: payload.data?.tag || 'default-notification',
    requireInteraction: payload.data?.requireInteraction === 'true',
    silent: payload.data?.silent === 'true',
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();

  const clickAction = event.action;
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  if (clickAction === 'dismiss') {
    // Just close the notification
    return;
  }

  // Handle 'view' action or default click
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window and navigate to target URL
          client.focus();
          if (targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('[firebase-messaging-sw.js] Notification closed:', event);
  
  // Optional: Track notification close analytics
  // You can send this data to your analytics service
});

// Handle push events (additional handling if needed)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push received:', event);
  
  // Firebase messaging handles this automatically, but you can add custom logic here
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Push payload:', payload);
      
      // Custom handling if needed
      // Note: Firebase messaging will also handle this, so avoid duplicate notifications
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
    }
  }
});

// Service worker activation
self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  
  // Clean up old caches or perform other maintenance tasks
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Clean up old notification-related caches if any
          if (cacheName.startsWith('notification-cache-')) {
            console.log('[firebase-messaging-sw.js] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Service worker installation
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service worker installing');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Handle messages from main thread
self.addEventListener('message', function(event) {
  console.log('[firebase-messaging-sw.js] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle other message types as needed
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: '1.0.0'
    });
  }
});