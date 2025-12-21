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
  googleAuth(idToken: string) {
    return apiRequest<{ user: AuthUser; token: { accessToken: string; refreshToken: string } }>(`/v1/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
  },
  me() {
    return apiRequest<AuthUser>(`/v1/auth/me`)
  },

  // Password Reset
  requestPasswordReset(email: string) {
    return apiRequest<{ message: string; resetToken?: string }>(`/v1/auth/reset-request`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  resetPassword(token: string, newPassword: string) {
    return apiRequest<{ message: string }>(`/v1/auth/reset`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  },

  updateProfile(name?: string, paymentQRFile?: File, avatarFile?: File) {
    const form = new FormData()
    if (name && name.trim()) form.append('name', name.trim())
    if (paymentQRFile) form.append('payment_qr', paymentQRFile)
    if (avatarFile) form.append('avatar', avatarFile)
    return apiRequest<{ message: string }>(`/v1/auth/profile`, { method: 'PATCH', body: form })
  },

  getUserPublicProfile(userId: string) {
    return apiRequest<{ id: string; name?: string | null; avatarUrl?: string | null; qrUrl?: string | null }>(
      `/v1/users/${encodeURIComponent(userId)}/profile`,
    )
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

  // Nudges
  sendNudge(debtorId: string, groupId: string, amount: number, message?: string) {
    return apiRequest<{ id: string; message: string; createdAt: string }>(`/v1/nudges`, {
      method: 'POST',
      body: JSON.stringify({ debtorId, groupId, amount, message }),
    })
  },
  listNudges() {
    return apiRequest<
      Array<{
        id: string
        groupId: string
        groupName: string
        senderId: string
        senderName: string
        amount: number
        message: string
        read: boolean
        createdAt: string
      }>
    >(`/v1/nudges`)
  },
  getUnreadNudgeCount() {
    return apiRequest<{ count: number }>(`/v1/nudges/unread-count`)
  },
  markNudgeRead(nudgeId: string) {
    return apiRequest<void>(`/v1/nudges/${encodeURIComponent(nudgeId)}/read`, { method: 'PATCH' })
  },
  markAllNudgesRead() {
    return apiRequest<void>(`/v1/nudges/mark-all-read`, { method: 'POST' })
  },

  // Push
  subscribePush(endpoint: string, keys: { p256dh: string; auth: string }) {
    return apiRequest<{ message: string }>(`/v1/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify({ endpoint, keys }),
    })
  },
  unsubscribePush(endpoint: string) {
    return apiRequest<void>(`/v1/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' })
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
  uploadPaymentProof(file: File) {
    const form = new FormData()
    form.append('proof', file)
    return apiRequest<{ proofUrl: string }>(`/v1/payments/upload-proof`, { method: 'POST', body: form })
  },
  approvePayment(paymentId: string) {
    return apiRequest<void>(`/v1/payments/${encodeURIComponent(paymentId)}/approve`, { method: 'PATCH' })
  },
  rejectPayment(paymentId: string) {
    return apiRequest<void>(`/v1/payments/${encodeURIComponent(paymentId)}/reject`, { method: 'PATCH' })
  },
}

