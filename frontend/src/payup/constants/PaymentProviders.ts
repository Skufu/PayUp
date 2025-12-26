export const PAYMENT_PROVIDERS = [
    {
        id: 'gcash',
        name: 'GCash',
        color: '#0070E0',
        lightColor: '#e6f1fc',
        icon: '💙',
        description: 'The most popular e-wallet in the PH'
    },
    {
        id: 'maya',
        name: 'Maya',
        color: '#00D26A',
        lightColor: '#e6fbf2',
        icon: '💚',
        description: 'Formerly PayMaya'
    },
] as const

export type PaymentProviderId = typeof PAYMENT_PROVIDERS[number]['id']
