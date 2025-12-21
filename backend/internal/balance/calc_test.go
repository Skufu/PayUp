package balance

import (
	"math"
	"testing"
)

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

// TestCompute_UnequalSplits_PHPRounding tests ₱100 split among 3 people.
// In PHP currency, we work with centavos. ₱100.00 / 3 = ₱33.33 + ₱33.33 + ₱33.34
// This tests that rounding is handled correctly (someone gets the extra centavo).
func TestCompute_UnequalSplits_PHPRounding(t *testing.T) {
	memberIDs := []string{"u1", "u2", "u3"}

	// ₱100 split 3 ways using centavo-based values (already rounded)
	// 100.00 / 3 = 33.33, 33.33, 33.34 (last person gets the extra centavo)
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  100.00,
			Splits: map[string]float64{
				"u1": 33.33,
				"u2": 33.33,
				"u3": 33.34,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// u1 paid 100, owes 33.33 → net +66.67
	expected1 := 100.00 - 33.33
	if !floatEquals(bal["u1"], expected1) {
		t.Errorf("u1 expected %.2f got %.2f", expected1, bal["u1"])
	}

	// u2 owes 33.33, paid nothing → net -33.33
	if !floatEquals(bal["u2"], -33.33) {
		t.Errorf("u2 expected -33.33 got %.2f", bal["u2"])
	}

	// u3 owes 33.34, paid nothing → net -33.34
	if !floatEquals(bal["u3"], -33.34) {
		t.Errorf("u3 expected -33.34 got %.2f", bal["u3"])
	}

	// Sum of all balances should be 0
	sum := bal["u1"] + bal["u2"] + bal["u3"]
	if !floatEquals(sum, 0) {
		t.Errorf("sum of balances should be 0, got %.4f", sum)
	}
}

// TestCompute_SettleUp tests the scenario where A owes B ₱50, B owes A ₱30.
// Net result: A owes B ₱20.
func TestCompute_SettleUp(t *testing.T) {
	memberIDs := []string{"A", "B"}

	expenses := []Expense{
		// B paid ₱100, split equally (A owes B ₱50)
		{
			PayerID: "B",
			Amount:  100,
			Splits: map[string]float64{
				"A": 50,
				"B": 50,
			},
		},
		// A paid ₱60, split equally (B owes A ₱30)
		{
			PayerID: "A",
			Amount:  60,
			Splits: map[string]float64{
				"A": 30,
				"B": 30,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// A: paid 60, owes 50+30=80 → net -20 (A owes 20)
	// B: paid 100, owes 50+30=80 → net +20 (B is owed 20)
	if !floatEquals(bal["A"], -20) {
		t.Errorf("A expected -20 got %.2f", bal["A"])
	}
	if !floatEquals(bal["B"], 20) {
		t.Errorf("B expected 20 got %.2f", bal["B"])
	}
}

// TestCompute_SettleUp_Complex tests a more complex settle-up scenario with 3 members.
func TestCompute_SettleUp_Complex(t *testing.T) {
	memberIDs := []string{"A", "B", "C"}

	expenses := []Expense{
		// A pays ₱300, split 3 ways (each owes ₱100)
		{
			PayerID: "A",
			Amount:  300,
			Splits: map[string]float64{
				"A": 100,
				"B": 100,
				"C": 100,
			},
		},
		// B pays ₱150, split 3 ways (each owes ₱50)
		{
			PayerID: "B",
			Amount:  150,
			Splits: map[string]float64{
				"A": 50,
				"B": 50,
				"C": 50,
			},
		},
		// C pays ₱90, split 3 ways (each owes ₱30)
		{
			PayerID: "C",
			Amount:  90,
			Splits: map[string]float64{
				"A": 30,
				"B": 30,
				"C": 30,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// A: paid 300, owes 100+50+30=180 → net +120
	// B: paid 150, owes 100+50+30=180 → net -30
	// C: paid 90, owes 100+50+30=180 → net -90
	if !floatEquals(bal["A"], 120) {
		t.Errorf("A expected 120 got %.2f", bal["A"])
	}
	if !floatEquals(bal["B"], -30) {
		t.Errorf("B expected -30 got %.2f", bal["B"])
	}
	if !floatEquals(bal["C"], -90) {
		t.Errorf("C expected -90 got %.2f", bal["C"])
	}

	// Sum should be 0
	sum := bal["A"] + bal["B"] + bal["C"]
	if !floatEquals(sum, 0) {
		t.Errorf("sum of balances should be 0, got %.4f", sum)
	}
}

// TestCompute_UnequalSplits_CustomAmounts tests non-equal splits where
// different members owe different amounts.
func TestCompute_UnequalSplits_CustomAmounts(t *testing.T) {
	memberIDs := []string{"u1", "u2", "u3"}

	// u1 pays ₱1000, but split is: u1 owes 200, u2 owes 500, u3 owes 300
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  1000,
			Splits: map[string]float64{
				"u1": 200,
				"u2": 500,
				"u3": 300,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// u1: paid 1000, owes 200 → net +800
	// u2: paid 0, owes 500 → net -500
	// u3: paid 0, owes 300 → net -300
	if !floatEquals(bal["u1"], 800) {
		t.Errorf("u1 expected 800 got %.2f", bal["u1"])
	}
	if !floatEquals(bal["u2"], -500) {
		t.Errorf("u2 expected -500 got %.2f", bal["u2"])
	}
	if !floatEquals(bal["u3"], -300) {
		t.Errorf("u3 expected -300 got %.2f", bal["u3"])
	}
}

// TestCompute_MultipleExpenses tests accumulation of multiple expenses.
func TestCompute_MultipleExpenses(t *testing.T) {
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
		{
			PayerID: "u1",
			Amount:  200,
			Splits: map[string]float64{
				"u1": 100,
				"u2": 100,
			},
		},
		{
			PayerID: "u2",
			Amount:  60,
			Splits: map[string]float64{
				"u1": 30,
				"u2": 30,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// u1: paid 100+200=300, owes 50+100+30=180 → net +120
	// u2: paid 60, owes 50+100+30=180 → net -120
	if !floatEquals(bal["u1"], 120) {
		t.Errorf("u1 expected 120 got %.2f", bal["u1"])
	}
	if !floatEquals(bal["u2"], -120) {
		t.Errorf("u2 expected -120 got %.2f", bal["u2"])
	}
}

// TestCompute_PayerNotMember tests error case when payer is not a member.
func TestCompute_PayerNotMember(t *testing.T) {
	memberIDs := []string{"u1", "u2"}
	expenses := []Expense{
		{
			PayerID: "u3", // not a member
			Amount:  100,
			Splits: map[string]float64{
				"u1": 50,
				"u2": 50,
			},
		},
	}

	_, err := Compute(memberIDs, expenses)
	if err == nil {
		t.Error("expected error for non-member payer")
	}
}

// TestCompute_SplitUserNotMember tests error case when split user is not a member.
func TestCompute_SplitUserNotMember(t *testing.T) {
	memberIDs := []string{"u1", "u2"}
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  100,
			Splits: map[string]float64{
				"u1": 50,
				"u3": 50, // not a member
			},
		},
	}

	_, err := Compute(memberIDs, expenses)
	if err == nil {
		t.Error("expected error for non-member split user")
	}
}

// TestCompute_SplitsMismatch tests error case when splits don't sum to amount.
func TestCompute_SplitsMismatch(t *testing.T) {
	memberIDs := []string{"u1", "u2"}
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  100,
			Splits: map[string]float64{
				"u1": 40,
				"u2": 50, // sum is 90, not 100
			},
		},
	}

	_, err := Compute(memberIDs, expenses)
	if err == nil {
		t.Error("expected error for mismatched splits")
	}
}

// TestCompute_EmptyExpenses tests computation with no expenses.
func TestCompute_EmptyExpenses(t *testing.T) {
	memberIDs := []string{"u1", "u2", "u3"}
	expenses := []Expense{}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, id := range memberIDs {
		if bal[id] != 0 {
			t.Errorf("expected balance 0 for %s, got %.2f", id, bal[id])
		}
	}
}

// TestCompute_SingleMember tests single member edge case.
func TestCompute_SingleMember(t *testing.T) {
	memberIDs := []string{"u1"}
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  100,
			Splits: map[string]float64{
				"u1": 100,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// u1 paid 100, owes 100 → net 0
	if !floatEquals(bal["u1"], 0) {
		t.Errorf("u1 expected 0 got %.2f", bal["u1"])
	}
}

// TestCompute_SettlementPayment tests that a settlement payment correctly
// offsets the balance (simulates approved payment behavior).
func TestCompute_SettlementPayment(t *testing.T) {
	memberIDs := []string{"A", "B"}

	expenses := []Expense{
		// Original expense: B paid ₱100, A owes ₱50
		{
			PayerID: "B",
			Amount:  100,
			Splits: map[string]float64{
				"A": 50,
				"B": 50,
			},
		},
		// Settlement: A paid ₱50 directly to B (recorded as transfer expense)
		// The payer is A, and the full amount is split to B
		{
			PayerID: "A",
			Amount:  50,
			Splits: map[string]float64{
				"B": 50,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// After settlement, both should be at 0
	// A: paid 50, owes 50 → net 0
	// B: paid 100, owes 50+50=100 → net 0
	if !floatEquals(bal["A"], 0) {
		t.Errorf("A expected 0 got %.2f", bal["A"])
	}
	if !floatEquals(bal["B"], 0) {
		t.Errorf("B expected 0 got %.2f", bal["B"])
	}
}

// TestCompute_SmallCentavoAmounts tests handling of small PHP amounts.
func TestCompute_SmallCentavoAmounts(t *testing.T) {
	memberIDs := []string{"u1", "u2"}

	// ₱0.50 split between 2 people
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  0.50,
			Splits: map[string]float64{
				"u1": 0.25,
				"u2": 0.25,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !floatEquals(bal["u1"], 0.25) {
		t.Errorf("u1 expected 0.25 got %.4f", bal["u1"])
	}
	if !floatEquals(bal["u2"], -0.25) {
		t.Errorf("u2 expected -0.25 got %.4f", bal["u2"])
	}
}

// TestCompute_LargeAmounts tests handling of large PHP amounts.
func TestCompute_LargeAmounts(t *testing.T) {
	memberIDs := []string{"u1", "u2"}

	// ₱1,000,000 split equally
	expenses := []Expense{
		{
			PayerID: "u1",
			Amount:  1000000,
			Splits: map[string]float64{
				"u1": 500000,
				"u2": 500000,
			},
		},
	}

	bal, err := Compute(memberIDs, expenses)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !floatEquals(bal["u1"], 500000) {
		t.Errorf("u1 expected 500000 got %.2f", bal["u1"])
	}
	if !floatEquals(bal["u2"], -500000) {
		t.Errorf("u2 expected -500000 got %.2f", bal["u2"])
	}
}

// floatEquals compares two floats with a small epsilon for floating point tolerance.
func floatEquals(a, b float64) bool {
	const epsilon = 0.001
	return math.Abs(a-b) < epsilon
}
