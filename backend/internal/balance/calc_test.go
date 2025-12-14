package balance

import "testing"

func TestCompute_Simple(t *testing.T) {
	memberIDs := []string{"u1", "u2"}
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  100,
			Splits: map[string]float64{
				"u1": 50,
				"u2": 50,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if bal["u1"] != 50 {
		t.Fatalf("u1 expected 50 got %v", bal["u1"])
	}
	if bal["u2"] != -50 {
		t.Fatalf("u2 expected -50 got %v", bal["u2"])
	}
}
