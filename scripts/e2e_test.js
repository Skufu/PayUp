#!/usr/bin/env node
/**
 * PayUp E2E Test Script
 * Tests the full flow: register -> login -> create group -> add expense
 * Uses fetch API to simulate frontend calls
 */

const API_BASE = process.env.API_BASE || 'http://localhost:8080';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}[E2E] ${msg}${colors.reset}`);
}

function logResponse(label, data) {
  console.log(`${colors.cyan}┌── ${label}${colors.reset}`);
  const lines = JSON.stringify(data, null, 2).split('\n');
  lines.forEach(line => {
    console.log(`${colors.cyan}│${colors.reset} ${line}`);
  });
  console.log(`${colors.cyan}└─────────────────────────────────────────────────────${colors.reset}`);
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// Test State
const state = {
  email: `e2e_${Date.now()}@test.com`,
  password: 'TestPassword123!',
  name: 'E2E Test User',
  token: null,
  userId: null,
  groupId: null,
  expenseId: null
};

// Tests
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  log('Starting E2E Tests...', 'blue');
  log(`API Base: ${API_BASE}`, 'cyan');
  log(`Test User: ${state.email}`, 'cyan');
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      process.stdout.write(`${colors.yellow}○${colors.reset} ${name} ... `);
      await fn();
      console.log(`${colors.green}✓${colors.reset}`);
      passed++;
    } catch (err) {
      console.log(`${colors.red}✗${colors.reset}`);
      console.log(`  ${colors.red}Error: ${err.message}${colors.reset}`);
      failed++;
    }
  }

  console.log('');
  log('='.repeat(50), 'blue');
  log(`Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  log('='.repeat(50), 'blue');

  return failed === 0;
}

// Test Definitions

test('Health Check', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/health`);
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data?.status !== 'ok') throw new Error('Health check failed');
});

test('Register User', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email: state.email,
      password: state.password,
      display_name: state.name
    })
  });

  if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
  if (!data?.token?.accessToken) throw new Error('No access token');

  state.token = data.token.accessToken;
  state.userId = data.user?.id;

  logResponse('Register Response', data);
});

test('Get Current User (Me)', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (data?.id !== state.userId) throw new Error('User ID mismatch');

  logResponse('Me Response', data);
});

test('Create Group', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/groups`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}` },
    body: JSON.stringify({
      name: 'E2E Test Group',
      description: 'Created by automated E2E test'
    })
  });

  if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
  if (!data?.id) throw new Error('No group ID');

  state.groupId = data.id;
  logResponse('Create Group Response', data);
});

test('List Groups', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/groups`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!Array.isArray(data)) throw new Error('Expected array');
  if (data.length === 0) throw new Error('Expected at least one group');

  logResponse('List Groups Response', { count: data.length, groups: data });
});

test('Create Expense', async () => {
  const splits = {};
  splits[state.userId] = 100.00;

  const { status, data } = await fetchJSON(`${API_BASE}/v1/groups/${state.groupId}/expenses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${state.token}` },
    body: JSON.stringify({
      title: 'E2E Test Expense',
      amount: 100.00,
      payerId: state.userId,
      splits: splits
    })
  });

  if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
  if (!data?.id) throw new Error('No expense ID');

  state.expenseId = data.id;
  logResponse('Create Expense Response', data);
});

test('List Expenses', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/groups/${state.groupId}/expenses`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!Array.isArray(data)) throw new Error('Expected array');
  if (data.length === 0) throw new Error('Expected at least one expense');

  logResponse('List Expenses Response', { count: data.length, expenses: data });
});

test('Get Balances', async () => {
  const { status, data } = await fetchJSON(`${API_BASE}/v1/groups/${state.groupId}/balances`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (typeof data !== 'object') throw new Error('Expected object');

  logResponse('Get Balances Response', data);
});

// Run all tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
