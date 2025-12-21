export type User = {
  id: string
  name: string
  avatar: string
  color: string
  qr: string
}

export type Group = {
  id: string
  name: string
  members: string[]
  createdAt: number
}

export type Expense = {
  id: string
  title: string
  amount: number
  payerId: string
  mode?: string
  type: 'expense' | 'transfer'
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

