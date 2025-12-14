import { Check, MapPin, Plus, User as UserIcon } from 'lucide-react'

import type { Group, User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  groups: Group[]
  currentGroupId?: string
  onSelectGroup: (g: Group) => void
  onCreateGroup: () => void
  onOpenProfile: () => void
  currentUser: User
}

export function SideMenu({
  isOpen,
  onClose,
  groups,
  currentGroupId,
  onSelectGroup,
  onCreateGroup,
  onOpenProfile,
  currentUser,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[80%] max-w-xs h-full bg-[#131316] border-r border-white/10 shadow-2xl animate-slide-in-left flex flex-col">
        <div className="p-6 border-b border-white/10 bg-[#1c1c21]">
          <h2 className="font-display text-2xl font-bold text-[#dfff4f] mb-1">PayUp</h2>
          <p className="text-xs text-gray-500 font-mono">Manage your trips</p>

          <div className="mt-5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${currentUser.color} flex items-center justify-center text-black font-bold`}>
              {currentUser.avatar}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">Current profile</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-4 ml-2">Your Groups</div>
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                onSelectGroup(group)
                onClose()
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                currentGroupId === group.id
                  ? 'bg-[#dfff4f]/10 border-[#dfff4f]/50 text-white'
                  : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  currentGroupId === group.id ? 'bg-[#dfff4f] text-black' : 'bg-[#1c1c21] text-gray-500'
                }`}
              >
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <div className={`font-bold text-sm truncate ${currentGroupId === group.id ? 'text-[#dfff4f]' : 'text-white'}`}>
                  {group.name}
                </div>
                <div className="text-[10px] truncate opacity-60">{group.members?.length || 0} Members</div>
              </div>
              {currentGroupId === group.id && <Check size={16} className="ml-auto text-[#dfff4f]" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0a0a0c] space-y-3">
          <button
            onClick={() => {
              onCreateGroup()
              onClose()
            }}
            className="w-full bg-[#1c1c21] hover:bg-white/10 text-white font-bold py-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} /> New Trip Group
          </button>
          <button
            onClick={() => {
              onOpenProfile()
              onClose()
            }}
            className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white py-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors font-mono text-sm"
          >
            <UserIcon size={16} /> My Profile
          </button>
        </div>
      </div>
    </div>
  )
}

