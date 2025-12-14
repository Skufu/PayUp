import { apiRequest } from './client'
import type { Expense } from '../types'

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  avatarUrl?: string | null
  qrUrl?: string | null
}

export const api = {
  // Auth
  register(email: string, password: string, name: string) {
    return apiRequest<{ user: AuthUser; token: { accessToken: string; refreshToken: string } }>(`/v1/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  },
  login(email: string, password: string) {
    return apiRequest<{ user: AuthUser; token: { accessToken: string; refreshToken: string } }>(`/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  me() {
    return apiRequest<AuthUser>(`/v1/auth/me`)
  },

  // Groups
  listGroups() {
    return apiRequest<Array<{ id: string; name: string; createdAt: string }>>(`/v1/groups`)
  },
  createGroup(name: string) {
    return apiRequest<{ id: string; name: string; createdAt: string }>(`/v1/groups`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },
  groupDetail(groupId: string) {
    return apiRequest<{
      id: string
      name: string
      createdAt: string
      members: Array<{ userId: string; name?: string; avatarUrl?: string; role: string; joinedAt: string }>
    }>(`/v1/groups/${encodeURIComponent(groupId)}`)
  },
  createInvite(groupId: string) {
    return apiRequest<{ code: string; expiresAt?: string }>(`/v1/groups/${encodeURIComponent(groupId)}/invite`, { method: 'POST' })
  },
  joinByCode(code: string) {
    return apiRequest<{ groupId: string }>(`/v1/groups/join/${encodeURIComponent(code)}`, { method: 'POST' })
  },

  // Expenses
  listExpenses(groupId: string) {
    return apiRequest<
      Array<{
        id: string
        groupId: string
        title: string
        amount: number
        payerId: string
        mode?: string | null
        type?: string | null
        splits: Record<string, number>
        createdAt: string
      }>
    >(`/v1/groups/${encodeURIComponent(groupId)}/expenses`)
  },
  createExpense(groupId: string, expense: Omit<Expense, 'id' | 'createdAt'>) {
    return apiRequest<{
      id: string
      groupId: string
      title: string
      amount: number
      payerId: string
      mode?: string | null
      type?: string | null
      splits: Record<string, number>
      createdAt: string
    }>(`/v1/groups/${encodeURIComponent(groupId)}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    })
  },
  deleteExpense(expenseId: string) {
    return apiRequest<void>(`/v1/expenses/${encodeURIComponent(expenseId)}`, { method: 'DELETE' })
  },

  // Balances
  getBalances(groupId: string) {
    return apiRequest<Record<string, number>>(`/v1/groups/${encodeURIComponent(groupId)}/balances`)
  },

  // Payments
  listPayments(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return apiRequest<
      Array<{
        id: string
        groupId: string
        senderId: string
        receiverId: string
        amount: number
        status: 'pending' | 'approved' | 'rejected'
        proofUrl?: string | null
        createdAt: string
      }>
    >(`/v1/payments${qs}`)
  },
  createPayment(groupId: string, receiverId: string, amount: number, proofUrl?: string) {
    return apiRequest<{
      id: string
      groupId: string
      senderId: string
      receiverId: string
      amount: number
      status: 'pending' | 'approved' | 'rejected'
      createdAt: string
    }>(`/v1/payments`, {
      method: 'POST',
      body: JSON.stringify({ groupId, receiverId, amount, proofUrl }),
    })
  },
  approvePayment(paymentId: string) {
    return apiRequest<void>(`/v1/payments/${encodeURIComponent(paymentId)}/approve`, { method: 'PATCH' })
  },
  rejectPayment(paymentId: string) {
    return apiRequest<void>(`/v1/payments/${encodeURIComponent(paymentId)}/reject`, { method: 'PATCH' })
  },
}

