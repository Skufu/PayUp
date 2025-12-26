import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type SSEEventType =
    | 'expense_created'
    | 'expense_updated'
    | 'expense_deleted'
    | 'payment_created'
    | 'payment_updated'
    | 'nudge_received'
    | 'member_joined'

interface SSEEvent {
    type: SSEEventType
    groupId: string
    data?: unknown
}

/**
 * Subscribe to real-time SSE updates for a group.
 * Automatically invalidates React Query cache when events are received.
 */
export function useGroupEvents(groupId: string | null) {
    const queryClient = useQueryClient()
    const eventSourceRef = useRef<EventSource | null>(null)

    useEffect(() => {
        if (!groupId) return

        // Get access token from sessionStorage (matches client.ts pattern)
        const token = sessionStorage.getItem('payup_access_token')
        if (!token) return

        // Build SSE URL with token as query param (EventSource can't set headers)
        const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
        const url = `${baseUrl}/v1/groups/${groupId}/events?token=${token}`

        const es = new EventSource(url)
        eventSourceRef.current = es

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SSEEvent

                switch (data.type) {
                    case 'expense_created':
                    case 'expense_updated':
                    case 'expense_deleted':
                        queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
                        queryClient.invalidateQueries({ queryKey: ['balances', groupId] })
                        break
                    case 'payment_created':
                    case 'payment_updated':
                        queryClient.invalidateQueries({ queryKey: ['payments'] })
                        queryClient.invalidateQueries({ queryKey: ['balances', groupId] })
                        break
                    case 'nudge_received':
                        queryClient.invalidateQueries({ queryKey: ['nudges'] })
                        queryClient.invalidateQueries({ queryKey: ['nudges', 'unread-count'] })
                        break
                    case 'member_joined':
                        queryClient.invalidateQueries({ queryKey: ['group', groupId] })
                        break
                }
            } catch {
                console.warn('Failed to parse SSE event:', event.data)
            }
        }

        es.onerror = () => {
            // EventSource auto-reconnects on error, just log for debugging
            console.warn('SSE connection error, will retry...')
        }

        return () => {
            es.close()
            eventSourceRef.current = null
        }
    }, [groupId, queryClient])
}
