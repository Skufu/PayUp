import type { Group, User } from '../types'

export const ALL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Adrian',
    avatar: 'A',
    color: 'bg-blue-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-ADRIAN-09170000001',
  },
  {
    id: 'u2',
    name: 'Hazel',
    avatar: 'H',
    color: 'bg-pink-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-HAZEL-09170000002',
  },
  {
    id: 'u3',
    name: 'Tyn',
    avatar: 'T',
    color: 'bg-purple-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-TYN-09170000003',
  },
  {
    id: 'u4',
    name: 'Banjo',
    avatar: 'B',
    color: 'bg-green-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-BANJO-09170000004',
  },
  {
    id: 'u5',
    name: 'Creed',
    avatar: 'C',
    color: 'bg-yellow-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-CREED-09170000005',
  },
  {
    id: 'u6',
    name: 'Owen',
    avatar: 'O',
    color: 'bg-orange-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-OWEN-09170000006',
  },
  {
    id: 'u7',
    name: 'Mika',
    avatar: 'M',
    color: 'bg-teal-500',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCASH-MIKA-09170000007',
  },
]

export const MOCK_PROOF_URL =
  'https://placehold.co/400x800/1c1c21/dfff4f?text=GCash+Receipt'

export const DEFAULT_GROUP: Group = {
  id: 'g1',
  name: 'Baguio Trip 2025',
  members: ALL_USERS.map((u) => u.id),
  createdAt: Date.now(),
}

