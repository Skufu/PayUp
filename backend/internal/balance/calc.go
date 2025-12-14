package balance

import "fmt"

// Expense is the minimal shape we need for balance computation.
// Amount and Splits are in "money units" (e.g. pesos) as float64.
type Expense struct {
	PayerID string
	Amount  float64
	Splits  map[string]float64 // userID -> share
}

// Compute returns balances per member:
// - payer gains the full expense amount
// - each split user owes their share (balance decreases)
func Compute(memberIDs []string, expenses []Expense) (map[string]float64, error) {
	bal := make(map[string]float64, len(memberIDs))
	for _, id := range memberIDs {
		bal[id] = 0
	}

	for _, e := range expenses {
		if _, ok := bal[e.PayerID]; !ok {
			return nil, fmt.Errorf("payer not a member: %s", e.PayerID)
		}
		bal[e.PayerID] += e.Amount

		var sum float64
		for uid, share := range e.Splits {
			if _, ok := bal[uid]; !ok {
				return nil, fmt.Errorf("split user not a member: %s", uid)
			}
			sum += share
			bal[uid] -= share
		}
		// keep validation lightweight: exact float comparison is fine for our API inputs,
		// but handlers already validate using cents; this is a guardrail for tests/usage.
		if sum != e.Amount {
			return nil, fmt.Errorf("splits must sum to amount: got %v want %v", sum, e.Amount)
		}
	}

	return bal, nil
}
