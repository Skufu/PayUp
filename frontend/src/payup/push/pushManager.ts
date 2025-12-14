const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const pushManager = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Push notifications not supported')
    }
    return await Notification.requestPermission()
  },

  async subscribe(apiCall: (endpoint: string, keys: { p256dh: string; auth: string }) => Promise<unknown>) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied')
    }

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    })

    const s = subscription.toJSON()
    if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) {
      throw new Error('Invalid subscription')
    }

    await apiCall(s.endpoint, { p256dh: s.keys.p256dh, auth: s.keys.auth })
  },

  async unsubscribe(apiCall: (endpoint: string) => Promise<unknown>) {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()
    await apiCall(subscription.endpoint)
  },

  async isSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  },
}

