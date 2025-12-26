export type User = {
  id: string
  name: string
  avatar: string
  color: string
  qr: string
  role?: string
  paymentQRs?: Array<{
    id: string
    provider: string
    qrUrl: string
    isPrimary: boolean
    createdAt: string
  }>
}

export type Group = {
  id: string
  name: string
  members: string[]
  createdAt: number
  memberCount?: number
}

export type Expense = {
  id: string
  title: string
  amount: number
  payerId: string
  mode?: string
  type?: string
  category?: string
  splits: Record<string, number>
  createdAt: number
}

export type Payment = {
  id: string
  senderId: string
  receiverId: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  proofUrl?: string | null
  createdAt: number
}

