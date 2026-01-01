// PayUp Service Worker - Push Notifications
// Handles push events when the app is closed or in background

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  const title = data.title || 'PayUp'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'payup-notification',
    renotify: true,
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to focus an existing window
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        return clients.openWindow(url)
      })
  )
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
