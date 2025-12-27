import type { ReactNode } from 'react'
import { memo, useCallback, useState } from 'react'
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
  Activity as ActivityIcon,
} from 'lucide-react'

import type { Group, User } from '../types'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'

type Props = {
  children: ReactNode
  currentUser: User
  onMenuClick: () => void
  currentGroup: Group | null
  activeTab: 'wallet' | 'notifications' | 'activity'
  onTabChange: (t: 'wallet' | 'notifications' | 'activity') => void
  notificationCount: number
  onCentralAdd: () => void
  onOpenMembers: () => void
  onOpenMyQr: () => void
  onOpenInvite: () => void
  onLogout: () => void
  onRefresh?: () => Promise<void>
  sidebar?: ReactNode
}

export const AppShell = memo(function AppShell({
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
  onRefresh,
  sidebar,
}: Props) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const toggleProfile = useCallback(() => setIsProfileOpen(prev => !prev), [])
  const closeProfile = useCallback(() => setIsProfileOpen(false), [])
  const handleWalletTab = useCallback(() => onTabChange('wallet'), [onTabChange])
  const handleNotificationsTab = useCallback(() => onTabChange('notifications'), [onTabChange])
  const handleActivityTab = useCallback(() => onTabChange('activity'), [onTabChange])

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
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#dfff4f] rounded-full filter blur-[120px] opacity-5 pointer-events-none z-0" />

        {/* Header */}
        <div className="relative z-40 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md px-4 py-3 flex justify-between items-center shrink-0 gap-4 md:px-6 md:py-4">
          {/* Left Slot - Mobile Menu Button */}
          <div className="w-10 md:hidden">
            <button
              onClick={onMenuClick}
              className={`p-2 -ml-2 text-gray-400 hover:text-white transition-colors`}
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Title / Group Name - Centered on Mobile, Left-aligned on Desktop */}
          <div className="flex-1 min-w-0 text-center md:text-left md:flex-initial">
            <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-[#dfff4f] truncate">
              {currentGroup ? currentGroup.name : 'PayUp'}
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase truncate">
              {currentGroup ? 'Trip Dashboard' : 'Loading...'}
            </p>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 mx-4 flex-1 justify-center max-w-md">
            <button
              onClick={handleWalletTab}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'wallet'
                ? 'bg-[#dfff4f] text-black shadow-lg shadow-[#dfff4f]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Wallet
            </button>
            <button
              onClick={handleNotificationsTab}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all relative ${activeTab === 'notifications'
                ? 'bg-[#dfff4f] text-black shadow-lg shadow-[#dfff4f]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Invoices
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff4f99] rounded-full" />
              )}
            </button>
            <button
              onClick={handleActivityTab}
              className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'activity'
                ? 'bg-[#dfff4f] text-black shadow-lg shadow-[#dfff4f]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Feed
            </button>
          </div>

          {/* Right Slot - Profile & Actions */}
          <div className="flex items-center justify-end gap-2 md:gap-4 w-10 md:w-auto">
            <button
              onClick={onOpenInvite}
              className="p-2 text-gray-400 hover:text-[#dfff4f] transition-colors md:block hidden"
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

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={toggleProfile}
                className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-full ${currentUser.avatarUrl ? '' : currentUser.color} flex items-center justify-center text-[10px] text-black font-bold overflow-hidden`}
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.avatar
                  )}
                </div>
                <ChevronDown size={12} className="text-gray-400 hidden md:block" />
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeProfile} />
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
        <PullToRefreshWrapper onRefresh={onRefresh}>
          {children}
        </PullToRefreshWrapper>

        {/* Bottom Nav - Mobile Only */}
        <div className="md:hidden border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-lg pb-6 pt-2 px-4 flex justify-between items-center z-40 shrink-0">
          <div className="flex flex-1 justify-around items-center">
            <NavIcon icon={Wallet} label="Wallet" active={activeTab === 'wallet'} onClick={handleWalletTab} />
            <NavIcon icon={ActivityIcon} label="Feed" active={activeTab === 'activity'} onClick={handleActivityTab} />
          </div>

          {/* Central Add Button */}
          <div className="relative -top-5 px-3">
            <button
              onClick={onCentralAdd}
              className="w-14 h-14 rounded-full bg-[#dfff4f] flex items-center justify-center text-black shadow-[0_0_20px_rgba(223,255,79,0.3)] border-4 border-[#0a0a0c] hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-1 justify-around items-center">
            <NavIcon
              icon={Bell}
              label="Invoices"
              active={activeTab === 'notifications'}
              onClick={handleNotificationsTab}
              badge={notificationCount}
            />
            <NavIcon icon={Share2} label="Share" onClick={onOpenInvite} />
          </div>
        </div>
      </div>
    </div>
  )
})

const NavIcon = memo(function NavIcon({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: typeof Wallet
  label?: string
  active?: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 p-2 rounded-2xl transition-all duration-300 ${active
        ? 'text-[#dfff4f]'
        : 'text-gray-600 hover:text-gray-300'
        }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      {label && (
        <span className={`text-[9px] font-mono tracking-tight ${active ? 'text-[#dfff4f]' : 'text-gray-500'}`}>
          {label}
        </span>
      )}
      {(badge ?? 0) > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff4f99] rounded-full border border-[#0a0a0c]" />
      )}
    </button>
  )
})

// Pull-to-refresh wrapper for main content
const PullToRefreshWrapper = memo(function PullToRefreshWrapper({
  children,
  onRefresh,
}: {
  children: React.ReactNode
  onRefresh?: () => Promise<void>
}) {
  const defaultRefresh = useCallback(async () => {
    // Default no-op if no refresh handler provided
  }, [])

  const {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress,
    handlers,
  } = usePullToRefresh({
    onRefresh: onRefresh ?? defaultRefresh,
    threshold: 80,
    disabled: !onRefresh,
  })

  return (
    <main
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-24 px-4 pt-6 relative z-10 md:px-12 md:pb-12"
      {...handlers}
    >
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
      />
      <div className="w-full">
        {children}
      </div>
    </main>
  )
})