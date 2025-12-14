import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  QrCode,
  Share2,
  Users,
  Wallet,
} from 'lucide-react'

import type { Group, User } from '../types'

type Props = {
  children: ReactNode
  currentUser: User
  onMenuClick: () => void
  currentGroup: Group | null
  activeTab: 'wallet' | 'notifications'
  onTabChange: (t: 'wallet' | 'notifications') => void
  notificationCount: number
  onCentralAdd: () => void
  onOpenMembers: () => void
  onOpenMyQr: () => void
  onLogout: () => void
}

export function AppShell({
  children,
  currentUser,
  onMenuClick,
  currentGroup,
  activeTab,
  onTabChange,
  notificationCount,
  onCentralAdd,
  onOpenMembers,
  onOpenMyQr,
  onLogout,
}: Props) {
  const [showInviteToast, setShowInviteToast] = useState(false)

  const handleInvite = () => {
    void navigator.clipboard.writeText(`https://payup.app/join/${currentGroup?.id || 'default'}`)
    setShowInviteToast(true)
    setTimeout(() => setShowInviteToast(false), 2000)
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050507] flex justify-center font-mono">
      <div className="w-full max-w-md h-full bg-[#0a0a0c] relative shadow-2xl flex flex-col border-x border-white/5">
        {/* Background Atmosphere */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-b from-[#1c1c21] to-transparent opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute top-[10%] right-[-10%] w-64 h-64 bg-[#dfff4f] rounded-full mix-blend-overlay filter blur-[100px] opacity-10 animate-float pointer-events-none" />

        {/* Header */}
        <div className="relative z-40 glass-panel px-4 py-4 flex justify-between items-center shrink-0 gap-3">
          <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-[#dfff4f] drop-shadow-md truncate">
              PayUp
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-[0.1em] uppercase truncate">
              {currentGroup ? currentGroup.name : 'Loading...'}
            </p>
          </div>

          <button
            onClick={handleInvite}
            className="p-2 text-gray-400 hover:text-[#dfff4f] transition-colors relative"
            title="Invite Friends"
          >
            <Share2 size={20} />
            {showInviteToast && (
              <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-[#dfff4f] text-black text-[10px] font-bold px-2 py-1 rounded animate-slide-up">
                Link Copied!
              </div>
            )}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
              <div
                className={`w-6 h-6 rounded-full ${currentUser.color} flex items-center justify-center text-[10px] text-black font-bold`}
              >
                {currentUser.avatar}
              </div>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#131316] border border-white/10 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Signed in</div>
                <div className="text-sm text-white font-mono truncate">{currentUser.name}</div>
              </div>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
              >
                <LogOut size={16} className="text-gray-400" />
                <span className="text-sm font-mono text-gray-200">Log out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-6 relative z-10 scroll-smooth">
          {children}
        </main>

        {/* Bottom Nav - Updated with Central Add Button */}
        <div className="glass-panel-top pb-8 pt-4 px-6 flex justify-between items-center z-40 shrink-0">
          <NavIcon icon={Wallet} active={activeTab === 'wallet'} onClick={() => onTabChange('wallet')} />
          <NavIcon
            icon={Bell}
            active={activeTab === 'notifications'}
            onClick={() => onTabChange('notifications')}
            badge={notificationCount}
          />

          {/* Central Add Button */}
          <div className="relative -top-6">
            <button
              onClick={onCentralAdd}
              className="w-16 h-16 rounded-full bg-[#dfff4f] flex items-center justify-center text-black shadow-[0_0_20px_rgba(223,255,79,0.4)] border-4 border-[#0a0a0c] hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
          </div>

          <NavIcon icon={Users} onClick={onOpenMembers} />
          <NavIcon icon={QrCode} onClick={onOpenMyQr} />
        </div>
      </div>
    </div>
  )
}

function NavIcon({
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  icon: typeof Wallet
  active?: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-2xl transition-all duration-300 ${
        active
          ? 'text-[#dfff4f] bg-[#dfff4f]/5 shadow-[0_0_15px_rgba(223,255,79,0.1)]'
          : 'text-gray-600 hover:text-gray-300'
      }`}
    >
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      {(badge ?? 0) > 0 && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ff4f99] rounded-full border border-[#0a0a0c]" />
      )}
    </button>
  )
}

