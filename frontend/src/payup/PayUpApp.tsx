import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Fonts } from './Fonts'
import { AppShell } from './components/AppShell'
import { NotificationView } from './components/NotificationView'
import { WalletView } from './components/WalletView'
import { ActivityFeed } from './components/ActivityFeed'
import { OfflineIndicator } from './components/OfflineIndicator'
import { SideMenu, SideMenuContent } from './components/modals/SideMenu'
import { ConfirmDialog } from './components/modals/ConfirmDialog'
import { api } from './api/endpoints'
import { useAuth } from './auth/useAuth'
import { useGroupEvents } from './hooks/useGroupEvents'
import { pushManager } from './push/pushManager'
import type { Expense, Payment, User } from './types'

// Lazy load modals - they are not needed on initial render
const AddExpenseModal = lazy(() => import('./components/modals/AddExpenseModal').then(m => ({ default: m.AddExpenseModal })))
const CreateGroupModal = lazy(() => import('./components/modals/CreateGroupModal').then(m => ({ default: m.CreateGroupModal })))
const InstallPrompt = lazy(() => import('./components/modals/InstallPrompt').then(m => ({ default: m.InstallPrompt })))
const JoinGroupModal = lazy(() => import('./components/modals/JoinGroupModal').then(m => ({ default: m.JoinGroupModal })))
const MembersModal = lazy(() => import('./components/modals/MembersModal').then(m => ({ default: m.MembersModal })))
const MyQrModal = lazy(() => import('./components/modals/MyQrModal').then(m => ({ default: m.MyQrModal })))
const PaymentModal = lazy(() => import('./components/modals/PaymentModal').then(m => ({ default: m.PaymentModal })))
const ProfileModal = lazy(() => import('./components/modals/ProfileModal').then(m => ({ default: m.ProfileModal })))
const PushNotificationPrompt = lazy(() => import('./components/modals/PushNotificationPrompt').then(m => ({ default: m.PushNotificationPrompt })))
const ShareInviteModal = lazy(() => import('./components/modals/ShareInviteModal').then(m => ({ default: m.ShareInviteModal })))

type AddModalMode = 'expense' | 'transfer'

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

export function PayUpApp() {
  const { state: authState, logout, refreshMe } = useAuth()
  const currentUser = authState.status === 'authed' ? authState.user : (null as unknown as User)
  const qc = useQueryClient()

  // Group State
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)

  // Data State
  // UI State
  const [activeTab, setActiveTab] = useState<'wallet' | 'notifications' | 'activity'>('wallet')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addModalMode, setAddModalMode] = useState<AddModalMode>('expense')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [payModal, setPayModal] = useState<{ open: boolean; payeeId: string | null; amount: number }>({
    open: false,
    payeeId: null,
    amount: 0,
  })
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isMyQrModalOpen, setIsMyQrModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isPushPromptOpen, setIsPushPromptOpen] = useState(false)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', variant: 'default', onConfirm: () => { } })

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.listGroups(),
    staleTime: 30 * 1000, // 30 seconds - groups don't change frequently
  })

  const effectiveGroupId = currentGroupId ?? groupsQuery.data?.[0]?.id ?? null

  // Subscribe to real-time SSE updates for the current group
  useGroupEvents(effectiveGroupId)

  const groupDetailQuery = useQuery({
    queryKey: ['group', effectiveGroupId],
    queryFn: () => api.groupDetail(effectiveGroupId!),
    enabled: !!effectiveGroupId,
    staleTime: 60 * 1000, // 1 minute - group details rarely change
  })

  const expensesQuery = useQuery({
    queryKey: ['expenses', effectiveGroupId],
    queryFn: () => api.listExpenses(effectiveGroupId!),
    enabled: !!effectiveGroupId,
    staleTime: 10 * 1000, // 10 seconds - expenses may change more often
    select: (rows) =>
      rows.map((r) => ({
        id: r.id,
        groupId: r.groupId,
        title: r.title,
        amount: r.amount,
        payerId: r.payerId,
        mode: r.mode ?? undefined,
        type: (r.type ?? 'expense') as 'expense' | 'transfer',
        splits: r.splits,
        createdAt: Date.parse(r.createdAt),
      })),
  })

  const balancesQuery = useQuery({
    queryKey: ['balances', effectiveGroupId],
    queryFn: () => api.getBalances(effectiveGroupId!),
    enabled: !!effectiveGroupId,
    staleTime: 10 * 1000, // 10 seconds - balances change with expenses
  })

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: () => api.listPayments('pending'),
    enabled: authState.status === 'authed' && !!effectiveGroupId,
    select: (rows) =>
      rows.map((p) => ({
        id: p.id,
        senderId: p.senderId,
        receiverId: p.receiverId,
        amount: p.amount,
        status: p.status,
        proofUrl: p.proofUrl,
        createdAt: Date.parse(p.createdAt),
      })),
  })

  // Activity Feed Query
  const activitiesQuery = useQuery({
    queryKey: ['activity', effectiveGroupId],
    queryFn: () => (effectiveGroupId ? api.getActivity(effectiveGroupId) : Promise.resolve([])),
    enabled: authState.status === 'authed' && !!effectiveGroupId && activeTab === 'activity',
    staleTime: 5000,
  })

  const unreadNudgeCountQuery = useQuery({
    queryKey: ['nudges', 'unread-count'],
    queryFn: () => api.getUnreadNudgeCount(),
    enabled: authState.status === 'authed',
    staleTime: 30 * 1000, // 30 seconds - nudge count doesn't need instant updates
    refetchInterval: 60 * 1000, // Refetch every minute in background
  })

  // 3) Active users
  const activeUsers = useMemo(() => {
    const members = groupDetailQuery.data?.members ?? []

    // Map members with real user data from backend
    const list = members.map((m) => {
      const displayName = m.name || `User ${m.userId.slice(0, 6)}`
      return {
        id: m.userId,
        name: displayName,
        avatar: initials(displayName),
        color: COLORS[hashString(m.userId) % COLORS.length],
        qr: m.avatarUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PAYUP-${encodeURIComponent(m.userId)}`,
        role: m.role,
      }
    })

    // During initial load, keep UI functional
    if (list.length === 0) return [currentUser]
    return list
  }, [groupDetailQuery.data, currentUser])

  const balances = balancesQuery.data ?? {}
  const expenses = expensesQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const currentGroup = useMemo(() => {
    if (!effectiveGroupId) return null
    const detail = groupDetailQuery.data
    const listRow = groupsQuery.data?.find((g) => g.id === effectiveGroupId)
    return {
      id: effectiveGroupId,
      name: detail?.name ?? listRow?.name ?? 'Trip',
      members: (detail?.members ?? []).map((m) => m.userId),
      createdAt: Date.parse(detail?.createdAt ?? listRow?.createdAt ?? new Date().toISOString()),
    }
  }, [effectiveGroupId, groupDetailQuery.data, groupsQuery.data])

  // 5) Handlers - memoized with useCallback to prevent unnecessary re-renders
  const handleCreateGroup = useCallback(async (name: string) => {
    const created = await api.createGroup(name)
    await qc.invalidateQueries({ queryKey: ['groups'] })
    setCurrentGroupId(created.id)
    setIsCreateGroupOpen(false)
  }, [qc])

  const handleAddExpense = useCallback(async (expenseData: { id?: string } & Omit<Expense, 'id' | 'createdAt'>) => {
    if (!effectiveGroupId) return
    const { id, ...data } = expenseData
    if (id) {
      await api.updateExpense(id, data)
    } else {
      await api.createExpense(effectiveGroupId, data)
    }
    await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['activity', effectiveGroupId] })
  }, [effectiveGroupId, qc])

  const handleDeleteExpense = useCallback((expenseId: string) => {
    if (!effectiveGroupId) return
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? Balances will be recalculated.',
      variant: 'danger',
      onConfirm: async () => {
        await api.deleteExpense(expenseId)
        await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
        await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
        await qc.invalidateQueries({ queryKey: ['activity', effectiveGroupId] })
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      },
    })
  }, [effectiveGroupId, qc])

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  const handlePaymentSubmit = useCallback(async (payeeId: string, amount: number, proofUrl?: string) => {
    if (!effectiveGroupId) return
    await api.createPayment(effectiveGroupId, payeeId, amount, proofUrl)
    await qc.invalidateQueries({ queryKey: ['payments', 'pending'] })
  }, [effectiveGroupId, qc])

  const handleReviewPayment = useCallback(async (paymentId: string, status: Payment['status']) => {
    if (!effectiveGroupId) return
    if (status === 'approved') await api.approvePayment(paymentId)
    if (status === 'rejected') await api.rejectPayment(paymentId)
    await qc.invalidateQueries({ queryKey: ['payments', 'pending'] })
    await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['activity', effectiveGroupId] })
  }, [effectiveGroupId, qc])

  const handleNudge = useCallback((userId: string, amount: number) => {
    if (!effectiveGroupId) return
    const user = activeUsers.find((u) => u.id === userId)
    const userName = user?.name || 'your friend'
    setConfirmDialog({
      isOpen: true,
      title: 'Send Reminder',
      message: `Send a payment reminder to ${userName} for ${amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}?`,
      variant: 'warning',
      onConfirm: async () => {
        await api.sendNudge(userId, effectiveGroupId, amount)
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      },
    })
  }, [effectiveGroupId, activeUsers])

  const openAddModal = useCallback((mode: AddModalMode) => {
    setEditingExpense(null)
    setAddModalMode(mode)
    setIsAddModalOpen(true)
  }, [])

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense)
    setAddModalMode((expense.type as AddModalMode) || 'expense')
    setIsAddModalOpen(true)
  }, [])

  const handleGenerateInvite = useCallback(async (groupId: string, options?: { expiresInHours?: number; maxUses?: number }) => {
    const result = await api.createInvite(groupId, options)
    return result
  }, [])

  const handleJoinGroup = useCallback(async (code: string) => {
    const result = await api.joinByCode(code)
    await qc.invalidateQueries({ queryKey: ['groups'] })
    setCurrentGroupId(result.groupId)
    setIsJoinGroupOpen(false)
  }, [qc])

  const handleLeaveGroup = useCallback(async () => {
    if (!effectiveGroupId) return
    setConfirmDialog({
      isOpen: true,
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group? You must have zero balance to leave.',
      variant: 'warning',
      onConfirm: async () => {
        await api.leaveGroup(effectiveGroupId)
        await qc.invalidateQueries({ queryKey: ['groups'] })
        setCurrentGroupId(null)
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        setIsMembersModalOpen(false)
      },
    })
  }, [effectiveGroupId, qc])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!effectiveGroupId) return
    const user = activeUsers.find(u => u.id === userId)
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${user?.name || 'this member'}? They must have zero balance.`,
      variant: 'danger',
      onConfirm: async () => {
        await api.removeMember(effectiveGroupId, userId)
        await qc.invalidateQueries({ queryKey: ['group', effectiveGroupId] })
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      },
    })
  }, [effectiveGroupId, qc, activeUsers])

  // Memoized UI callbacks
  const handleOpenMenu = useCallback(() => setIsMenuOpen(true), [])
  const handleCloseMenu = useCallback(() => setIsMenuOpen(false), [])
  const handleOpenCreateGroup = useCallback(() => setIsCreateGroupOpen(true), [])
  const handleCloseCreateGroup = useCallback(() => setIsCreateGroupOpen(false), [])
  const handleOpenJoinGroup = useCallback(() => setIsJoinGroupOpen(true), [])
  const handleCloseJoinGroup = useCallback(() => setIsJoinGroupOpen(false), [])
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), [])
  const handleCloseProfile = useCallback(() => setIsProfileOpen(false), [])
  const handleOpenMembers = useCallback(() => setIsMembersModalOpen(true), [])
  const handleCloseMembers = useCallback(() => setIsMembersModalOpen(false), [])
  const handleOpenMyQr = useCallback(() => setIsMyQrModalOpen(true), [])
  const handleCloseMyQr = useCallback(() => setIsMyQrModalOpen(false), [])
  const handleOpenInvite = useCallback(() => setIsInviteModalOpen(true), [])
  const handleCloseInvite = useCallback(() => setIsInviteModalOpen(false), [])
  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false)
    setEditingExpense(null)
  }, [])
  const handleClosePushPrompt = useCallback(() => setIsPushPromptOpen(false), [])
  const handleCentralAdd = useCallback(() => openAddModal('expense'), [openAddModal])
  const handlePayClick = useCallback((uid: string, amt: number) => setPayModal({ open: true, payeeId: uid, amount: amt }), [])
  const handleClosePayModal = useCallback(() => setPayModal((p) => ({ ...p, open: false })), [])
  const handleSelectGroup = useCallback((g: { id: string }) => setCurrentGroupId(g.id), [])

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] }),
      qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] }),
      qc.invalidateQueries({ queryKey: ['payments', 'pending'] }),
      qc.invalidateQueries({ queryKey: ['activity', effectiveGroupId] }),
    ])
  }, [qc, effectiveGroupId])

  const pendingCount =
    payments.filter((p) => p.receiverId === currentUser.id && p.status === 'pending').length +
    (unreadNudgeCountQuery.data?.count ?? 0)

  // Memoize groups list to prevent recreating on every render
  const groupsList = useMemo(() => {
    return (groupsQuery.data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      members: [] as string[],
      createdAt: Date.parse(g.createdAt),
      memberCount: g.memberCount,
    }))
  }, [groupsQuery.data])

  useEffect(() => {
    if (authState.status !== 'authed') return
    if (!('Notification' in window)) return

    let timer: number | undefined
    const run = async () => {
      const permission = Notification.permission
      const subscribed = await pushManager.isSubscribed()
      if (permission === 'default' && !subscribed) {
        timer = window.setTimeout(() => setIsPushPromptOpen(true), 5000)
      }
    }

    void run()
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [authState.status])

  return (
    <>
      <OfflineIndicator />
      <Fonts />
      <AppShell
        currentUser={currentUser}
        onMenuClick={handleOpenMenu}
        currentGroup={currentGroup}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notificationCount={pendingCount}
        onCentralAdd={handleCentralAdd}
        onOpenMembers={handleOpenMembers}
        onOpenMyQr={handleOpenMyQr}
        onOpenInvite={handleOpenInvite}
        onLogout={logout}
        onRefresh={handleRefresh}
        sidebar={
          <SideMenuContent
            groups={groupsList}
            currentGroupId={currentGroup?.id}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={handleOpenCreateGroup}
            onJoinGroup={handleOpenJoinGroup}
            onOpenProfile={handleOpenProfile}
            onOpenMembers={handleOpenMembers}
            currentUser={currentUser}
          />
        }
      >
        {activeTab === 'wallet' && (
          <WalletView
            balances={balances}
            currentUser={currentUser}
            activeUsers={activeUsers}
            currentGroup={currentGroup}
            expenses={expenses}
            onPayClick={handlePayClick}
            onNudgeClick={handleNudge}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationView
            payments={payments}
            currentUser={currentUser}
            activeUsers={activeUsers}
            onReviewPayment={handleReviewPayment}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityFeed activities={activitiesQuery.data ?? []} />
        )}
      </AppShell>

      {/* Modals & Overlays - Wrapped in Suspense for lazy loading */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={handleCloseMenu}
        groups={groupsList}
        currentGroupId={currentGroup?.id}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleOpenCreateGroup}
        onJoinGroup={handleOpenJoinGroup}
        onOpenProfile={handleOpenProfile}
        onOpenMembers={handleOpenMembers}
        currentUser={currentUser}
      />

      <Suspense fallback={null}>
        {isCreateGroupOpen && (
          <CreateGroupModal isOpen onClose={handleCloseCreateGroup} onConfirm={handleCreateGroup} />
        )}

        {isJoinGroupOpen && (
          <JoinGroupModal isOpen onClose={handleCloseJoinGroup} onJoin={handleJoinGroup} />
        )}

        {isProfileOpen && (
          <ProfileModal isOpen onClose={handleCloseProfile} currentUser={currentUser} onUpdateProfile={refreshMe} />
        )}

        {isAddModalOpen && (
          <AddExpenseModal
            isOpen
            initialMode={addModalMode}
            editingExpense={editingExpense}
            onClose={handleCloseAddModal}
            currentUser={currentUser}
            activeUsers={activeUsers}
            onAdd={handleAddExpense}
          />
        )}

        {payModal.open && (
          <PaymentModal
            isOpen
            onClose={handleClosePayModal}
            payeeId={payModal.payeeId}
            amount={payModal.amount}
            currentUser={currentUser}
            activeUsers={activeUsers}
            onSubmitPayment={handlePaymentSubmit}
          />
        )}

        {isMembersModalOpen && (
          <MembersModal
            isOpen
            onClose={handleCloseMembers}
            activeUsers={activeUsers}
            balances={balances}
            currentUser={currentUser}
            onLeave={handleLeaveGroup}
            onRemove={handleRemoveMember}
          />
        )}

        {isMyQrModalOpen && <MyQrModal isOpen onClose={handleCloseMyQr} currentUser={currentUser} />}

        {isInviteModalOpen && currentGroup && (
          <ShareInviteModal
            isOpen
            onClose={handleCloseInvite}
            groupId={currentGroup.id}
            groupName={currentGroup.name}
            onGenerateInvite={handleGenerateInvite}
          />
        )}

        <InstallPrompt />
        <PushNotificationPrompt isOpen={isPushPromptOpen} onClose={handleClosePushPrompt} />
      </Suspense>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={handleCloseConfirmDialog}
        confirmLabel={confirmDialog.variant === 'danger' ? 'Delete' : confirmDialog.variant === 'warning' ? 'Send' : 'Confirm'}
      />
    </>
  )
}

