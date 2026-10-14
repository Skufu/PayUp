#!/bin/bash
# E2E Test Runner for PayUp
# Starts backend and runs E2E tests

set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://localhost:8080}"

echo "╔══════════════════════════════════════════════════════════════════════════════━┛"
echo "║  PayUp E2E Test Suite                                                                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════════━┛"
echo ""

# Check if backend is already running
echo "🔍 Checking if backend is running..."
if curl -s "${API_BASE}/health" > /dev/null 2>&1; then
    echo "✅ Backend already running at ${API_BASE}"
    BACKEND_PID=""
else
    echo "🚀 Starting backend..."
    cd backend
    go run ./cmd/api > /tmp/payup_backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to be ready
    echo "⏳ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s "${API_BASE}/health" > /dev/null 2>&1; then
            echo "✅ Backend is ready!"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start within 30 seconds"
            cat /tmp/payup_backend.log
            exit 1
        fi
    done
fi

echo ""
echo "🧪 Running E2E Tests..."
echo ""

# Run the Node.js E2E test
if command -v node &> /dev/null; then
    node scripts/e2e_test.js
    TEST_EXIT=$?
else
    echo "❌ Node.js not found. Skipping E2E tests."
    TEST_EXIT=1
fi

# Cleanup
if [ -n "$BACKEND_PID" ]; then
    echo ""
    echo "🧹 Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
fi

echo ""
if [ $TEST_EXIT -eq 0 ]; then
    echo "✅ All E2E tests passed!"
else
    echo "❌ Some E2E tests failed!"
fi

exit $TEST_EXIT
