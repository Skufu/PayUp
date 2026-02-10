import { Check, LogIn, MapPin, Plus, User as UserIcon, Users } from 'lucide-react'

import type { Group, User } from '../../types'
import { ModalWrapper } from './ModalWrapper'

type Props = {
  isOpen: boolean
  onClose: () => void
  groups: Group[]
  currentGroupId?: string
  onSelectGroup: (g: Group) => void
  onCreateGroup: () => void
  onJoinGroup: () => void
  onOpenProfile: () => void
  onOpenMembers: () => void
  currentUser: User
}

type SideMenuContentProps = {
  groups: Group[]
  currentGroupId?: string
  onSelectGroup: (g: Group) => void
  onCreateGroup: () => void
  onJoinGroup: () => void
  onOpenProfile: () => void
  onOpenMembers: () => void
  currentUser: User
  className?: string
}

export function SideMenuContent({
  groups,
  currentGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  onOpenProfile,
  onOpenMembers,
  currentUser,
  className = '',
}: SideMenuContentProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-6 border-b border-white/10 bg-[#1c1c21]">
        <h2 className="font-display text-2xl font-bold text-[#dfff4f] mb-1">PayUp</h2>
        <p className="text-xs text-gray-500 font-mono">Manage your trips</p>

        <div className="mt-5 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${currentUser.avatarUrl ? '' : currentUser.color} flex items-center justify-center text-black font-bold overflow-hidden`}>
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              currentUser.avatar
            )}
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
            }}
            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group/item ${currentGroupId === group.id
              ? 'bg-[#dfff4f]/10 border-[#dfff4f]/50 text-white shadow-[0_0_15px_rgba(223,255,79,0.1)]'
              : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${currentGroupId === group.id ? 'bg-[#dfff4f] text-black' : 'bg-[#1c1c21] text-gray-500 group-hover/item:text-gray-300'
                }`}
            >
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <div className={`font-bold text-sm truncate ${currentGroupId === group.id ? 'text-[#dfff4f]' : 'text-gray-300'}`}>
                {group.name}
              </div>
              <div className="text-[10px] truncate opacity-60">{group.memberCount ?? group.members?.length ?? 0} {(group.memberCount ?? group.members?.length ?? 0) === 1 ? 'Member' : 'Members'}</div>
            </div>
            {currentGroupId === group.id && <Check size={14} className="ml-auto text-[#dfff4f]" />}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-white/5 bg-[#0a0a0c]/50 space-y-1">
        <button
          onClick={onCreateGroup}
          className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center gap-3 text-xs font-bold font-mono uppercase tracking-wide group"
        >
          <div className="w-8 h-8 rounded-full bg-[#1c1c21] flex items-center justify-center text-gray-500 group-hover:text-white transition-colors border border-white/5">
            <Plus size={14} />
          </div>
          New Group
        </button>
        <button
          onClick={onJoinGroup}
          className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center gap-3 text-xs font-bold font-mono uppercase tracking-wide group"
        >
          <div className="w-8 h-8 rounded-full bg-[#1c1c21] flex items-center justify-center text-gray-500 group-hover:text-white transition-colors border border-white/5">
            <LogIn size={14} />
          </div>
          Join Group
        </button>
        <button
          onClick={onOpenMembers}
          className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center gap-3 text-xs font-bold font-mono uppercase tracking-wide group"
        >
          <div className="w-8 h-8 rounded-full bg-[#1c1c21] flex items-center justify-center text-gray-500 group-hover:text-white transition-colors border border-white/5">
            <Users size={14} />
          </div>
          Group Members
        </button>
        <button
          onClick={onOpenProfile}
          className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center gap-3 text-xs font-bold font-mono uppercase tracking-wide group"
        >
          <div className="w-8 h-8 rounded-full bg-[#1c1c21] flex items-center justify-center text-gray-500 group-hover:text-white transition-colors border border-white/5">
            <UserIcon size={14} />
          </div>
          My Profile
        </button>
      </div>
    </div>
  )
}

export function SideMenu({
  isOpen,
  onClose,
  ...contentProps
}: Props) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} variant="side" zIndex="z-50" className="h-full bg-[#131316] border-r border-white/10 shadow-2xl">
      <SideMenuContent
        {...contentProps}
        onSelectGroup={(g) => {
          contentProps.onSelectGroup(g)
          onClose()
        }}
        onCreateGroup={() => {
          contentProps.onCreateGroup()
          onClose()
        }}
        onJoinGroup={() => {
          contentProps.onJoinGroup()
          onClose()
        }}
        onOpenProfile={() => {
          contentProps.onOpenProfile()
          onClose()
        }}
        onOpenMembers={() => {
          contentProps.onOpenMembers()
          onClose()
        }}
      />
    </ModalWrapper>
  )
}
