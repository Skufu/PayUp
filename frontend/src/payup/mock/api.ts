import type { Expense, Group, Payment } from '../types'
import { DEFAULT_GROUP } from './data'

type Store = {
  groups: Group[]
  expensesByGroup: Record<string, Expense[]>
  paymentsByGroup: Record<string, Payment[]>
}

const LS_KEY = 'payup_mock_v1'

function now(): number {
  return Date.now()
}

function newId(prefix: string): string {
  // browser-safe id generation
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
}

function load(): Store {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) {
    const init: Store = {
      groups: [DEFAULT_GROUP],
      expensesByGroup: { [DEFAULT_GROUP.id]: [] },
      paymentsByGroup: { [DEFAULT_GROUP.id]: [] },
    }
    localStorage.setItem(LS_KEY, JSON.stringify(init))
    return init
  }
  try {
    return JSON.parse(raw) as Store
  } catch {
    localStorage.removeItem(LS_KEY)
    return load()
  }
}

function save(s: Store) {
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

export const mockApi = {
  async listGroups(): Promise<Group[]> {
    return load().groups.slice().sort((a, b) => b.createdAt - a.createdAt)
  },

  async createGroup(name: string, memberIds: string[]): Promise<Group> {
    const s = load()
    const g: Group = { id: newId('g'), name, members: memberIds, createdAt: now() }
    s.groups = [g, ...s.groups]
    s.expensesByGroup[g.id] = []
    s.paymentsByGroup[g.id] = []
    save(s)
    return g
  },

  async listExpenses(groupId: string): Promise<Expense[]> {
    const s = load()
    return (s.expensesByGroup[groupId] ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)
  },

  async addExpense(groupId: string, expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const s = load()
    const e: Expense = { ...expense, id: newId('e'), createdAt: now() }
    s.expensesByGroup[groupId] = [e, ...(s.expensesByGroup[groupId] ?? [])]
    save(s)
    return e
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    const s = load()
    s.expensesByGroup[groupId] = (s.expensesByGroup[groupId] ?? []).filter((e) => e.id !== expenseId)
    save(s)
  },

  async listPayments(groupId: string): Promise<Payment[]> {
    const s = load()
    return (s.paymentsByGroup[groupId] ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)
  },

  async addPayment(groupId: string, payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const s = load()
    const p: Payment = { ...payment, id: newId('p'), createdAt: now() }
    s.paymentsByGroup[groupId] = [p, ...(s.paymentsByGroup[groupId] ?? [])]
    save(s)
    return p
  },

  async setPaymentStatus(groupId: string, paymentId: string, status: Payment['status']): Promise<void> {
    const s = load()
    s.paymentsByGroup[groupId] = (s.paymentsByGroup[groupId] ?? []).map((p) =>
      p.id === paymentId ? { ...p, status } : p,
    )
    save(s)
  },
}

