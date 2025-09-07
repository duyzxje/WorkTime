// Service Worker for PWA Push Notifications
const CACHE_NAME = 'worktime-v1';
const urlsToCache = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Push event - Xử lý push notifications
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    let notificationData = {
        title: 'WorkTime Notification',
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'worktime-notification',
        data: {
            url: '/notifications'
        }
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = {
                title: pushData.title || notificationData.title,
                body: pushData.body || notificationData.body,
                icon: pushData.icon || notificationData.icon,
                badge: pushData.badge || notificationData.badge,
                tag: pushData.tag || notificationData.tag,
                data: pushData.data || notificationData.data,
                actions: pushData.actions || [
                    {
                        action: 'view',
                        title: 'Xem',
                        icon: '/icon-view.png'
                    },
                    {
                        action: 'dismiss',
                        title: 'Đóng',
                        icon: '/icon-dismiss.png'
                    }
                ],
                requireInteraction: true,
                silent: false
            };
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }

    const promiseChain = self.registration.showNotification(
        notificationData.title,
        notificationData
    );

    event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    if (action === 'dismiss') {
        // Just close the notification
        return;
    }

    // Default action or 'view' action
    const urlToOpen = notificationData?.url || '/notifications';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }

            // If no existing window, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);

    // Track notification dismissal if needed
    const notificationData = event.notification.data;
    if (notificationData?.notificationId) {
        // You can send analytics data here
        console.log('Notification dismissed:', notificationData.notificationId);
    }
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
    console.log('Background sync event:', event.tag);

    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Perform background sync tasks
            doBackgroundSync()
        );
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        // Sync any pending data when back online
        console.log('Performing background sync...');

        // You can implement offline data sync here
        // For example, sync pending notifications, attendance data, etc.

    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Message event (for communication with main thread)
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'content-sync') {
            event.waitUntil(doBackgroundSync());
        }
    });
}

console.log('Service Worker loaded successfully');
