package events

import (
	"encoding/json"
	"sync"
)

// EventType represents the type of real-time event
type EventType string

const (
	ExpenseCreated EventType = "expense_created"
	ExpenseUpdated EventType = "expense_updated"
	ExpenseDeleted EventType = "expense_deleted"
	PaymentCreated EventType = "payment_created"
	PaymentUpdated EventType = "payment_updated"
	NudgeReceived  EventType = "nudge_received"
	MemberJoined   EventType = "member_joined"
)

// Event represents a real-time event to be broadcast to clients
type Event struct {
	Type    EventType   `json:"type"`
	GroupID string      `json:"groupId"`
	Data    interface{} `json:"data,omitempty"`
}

// JSON returns the event serialized as JSON bytes
func (e Event) JSON() []byte {
	b, _ := json.Marshal(e)
	return b
}

// Hub manages SSE client connections and event broadcasting per group
type Hub struct {
	// clients maps groupID -> set of client channels
	clients map[string]map[chan Event]bool
	mu      sync.RWMutex
}

// NewHub creates a new event hub
func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[chan Event]bool),
	}
}

// Subscribe registers a new client for a group and returns a channel for events
func (h *Hub) Subscribe(groupID string) chan Event {
	h.mu.Lock()
	defer h.mu.Unlock()

	ch := make(chan Event, 10) // Buffered to prevent blocking

	if h.clients[groupID] == nil {
		h.clients[groupID] = make(map[chan Event]bool)
	}
	h.clients[groupID][ch] = true

	return ch
}

// Unsubscribe removes a client from a group
func (h *Hub) Unsubscribe(groupID string, ch chan Event) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[groupID] != nil {
		delete(h.clients[groupID], ch)
		close(ch)

		// Clean up empty group map
		if len(h.clients[groupID]) == 0 {
			delete(h.clients, groupID)
		}
	}
}

// Broadcast sends an event to all clients subscribed to a group
func (h *Hub) Broadcast(groupID string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients := h.clients[groupID]
	if clients == nil {
		return
	}

	for ch := range clients {
		// Non-blocking send - drop event if client buffer is full
		select {
		case ch <- event:
		default:
			// Client is slow, skip this event
		}
	}
}

// ClientCount returns the number of connected clients for a group
func (h *Hub) ClientCount(groupID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return len(h.clients[groupID])
}
