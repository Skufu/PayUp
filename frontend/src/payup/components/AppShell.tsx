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
  onOpenInvite: () => void
  onLogout: () => void
  sidebar?: ReactNode
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
  onOpenInvite,
  onLogout,
  sidebar,
}: Props) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <div className="h-[100dvh] w-full bg-[#050507] font-mono flex md:flex-row overflow-hidden text-gray-100">
      {/* Desktop Sidebar - Always visible on desktop */}
      {sidebar && (
        <div className="hidden md:flex w-72 border-r border-white/5 bg-[#08080a] shrink-0 flex-col z-20">
          {sidebar}
        </div>
      )}

      {/* Main Content Area - Takes remaining width */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0a0a0c] min-w-0">
        {/* Simplified Background - Better Performance */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] to-[#050507] z-0" />
        {/* Subtle ambient light - static, no heavy animation */}
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#dfff4f] rounded-full mix-blend-overlay filter blur-[120px] opacity-5 pointer-events-none" />

        {/* Header */}
        <div className="relative z-40 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md px-4 py-3 flex justify-between items-center shrink-0 gap-4 md:px-6 md:py-4">
          {/* Mobile Menu Button */}
          <button 
            onClick={onMenuClick} 
            className={`p-2 -ml-2 text-gray-400 hover:text-white transition-colors md:hidden`}
          >
            <Menu size={24} />
          </button>

          {/* Title / Group Name */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-[#dfff4f] truncate">
              {currentGroup ? currentGroup.name : 'PayUp'}
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase truncate">
              {currentGroup ? 'Trip Dashboard' : 'Loading...'}
            </p>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 mx-4">
              <button
                onClick={() => onTabChange('wallet')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'wallet' 
                  ? 'bg-[#dfff4f] text-black shadow-lg shadow-[#dfff4f]/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Wallet
              </button>
              <button
                onClick={() => onTabChange('notifications')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all relative ${
                  activeTab === 'notifications' 
                  ? 'bg-[#dfff4f] text-black shadow-lg shadow-[#dfff4f]/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Activity
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff4f99] rounded-full" />
                )}
              </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={onOpenInvite}
              className="p-2 text-gray-400 hover:text-[#dfff4f] transition-colors"
              title="Invite Friends"
            >
              <Share2 size={20} />
            </button>

            {/* Desktop Quick Actions */}
            <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-4">
               <button onClick={onOpenMembers} className="p-2 text-gray-400 hover:text-white transition-colors" title="Members">
                   <Users size={20} />
               </button>
               <button onClick={onOpenMyQr} className="p-2 text-gray-400 hover:text-white transition-colors" title="My QR">
                   <QrCode size={20} />
               </button>
               <button 
                onClick={onCentralAdd}
                className="ml-2 bg-[#dfff4f] text-black px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-[#dfff4f]/10 hover:bg-[#ccee3e] transition-colors flex items-center gap-2"
               >
                   <Plus size={16} strokeWidth={3} /> Add
               </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative pl-2 md:pl-0">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-full ${currentUser.color} flex items-center justify-center text-[10px] text-black font-bold`}
                >
                  {currentUser.avatar}
                </div>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#131316] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-slide-up z-50">
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-24 px-4 pt-6 relative z-10 md:px-12 md:pb-12">
          <div className="w-full">
             {children}
          </div>
        </main>

        {/* Bottom Nav - Mobile Only */}
        <div className="md:hidden border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-lg pb-8 pt-2 px-6 flex justify-between items-center z-40 shrink-0">
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
              className="w-14 h-14 rounded-full bg-[#dfff4f] flex items-center justify-center text-black shadow-[0_0_20px_rgba(223,255,79,0.3)] border-4 border-[#0a0a0c] hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={28} strokeWidth={2.5} />
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