import type { User } from '../types'
import type { AuthUser } from '../api/endpoints'

const COLORS = [
  'bg-blue-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
}

export function uiUserFromAuth(u: AuthUser): User {
  const display = (u.name ?? u.email ?? 'User').trim()
  const color = COLORS[hashString(u.id) % COLORS.length]
  return {
    id: u.id,
    name: display,
    avatar: initials(display),
    avatarUrl: u.avatarUrl ?? undefined,
    color,
    qr: u.qrUrl ?? '',
  }
}

export function uiUserFromID(id: string, name?: string): User {
  const color = COLORS[hashString(id) % COLORS.length]
  const display = name || `User ${id.slice(0, 6)}`
  return {
    id,
    name: display,
    avatar: initials(display),
    color,
    qr: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PAYUP-${encodeURIComponent(id)}`,
  }
}

