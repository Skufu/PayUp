import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Fonts } from './Fonts'
import { AppShell } from './components/AppShell'
import { NotificationView } from './components/NotificationView'
import { WalletView } from './components/WalletView'
import { AddExpenseModal } from './components/modals/AddExpenseModal'
import { CreateGroupModal } from './components/modals/CreateGroupModal'
import { MembersModal } from './components/modals/MembersModal'
import { MyQrModal } from './components/modals/MyQrModal'
import { PaymentModal } from './components/modals/PaymentModal'
import { ProfileModal } from './components/modals/ProfileModal'
import { ShareInviteModal } from './components/modals/ShareInviteModal'
import { SideMenu, SideMenuContent } from './components/modals/SideMenu'
import { api } from './api/endpoints'
import { useAuth } from './auth/useAuth'
import type { Expense, Payment, User } from './types'
import { uiUserFromID } from './ui/users'

type AddModalMode = 'expense' | 'transfer'

export function PayUpApp() {
  const { state: authState, logout } = useAuth()
  const currentUser = authState.status === 'authed' ? authState.user : (null as unknown as User)
  const qc = useQueryClient()

  // Group State
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)

  // Data State
  // UI State
  const [activeTab, setActiveTab] = useState<'wallet' | 'notifications'>('wallet')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addModalMode, setAddModalMode] = useState<AddModalMode>('expense')
  const [payModal, setPayModal] = useState<{ open: boolean; payeeId: string | null; amount: number }>({
    open: false,
    payeeId: null,
    amount: 0,
  })
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isMyQrModalOpen, setIsMyQrModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.listGroups(),
  })

  const effectiveGroupId = currentGroupId ?? groupsQuery.data?.[0]?.id ?? null

  const groupDetailQuery = useQuery({
    queryKey: ['group', effectiveGroupId],
    queryFn: () => api.groupDetail(effectiveGroupId!),
    enabled: !!effectiveGroupId,
  })

  const expensesQuery = useQuery({
    queryKey: ['expenses', effectiveGroupId],
    queryFn: () => api.listExpenses(effectiveGroupId!),
    enabled: !!effectiveGroupId,
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
  })

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'pending'],
    queryFn: () => api.listPayments('pending'),
    enabled: activeTab === 'notifications',
    select: (rows) =>
      rows.map((p) => ({
        id: p.id,
        senderId: p.senderId,
        receiverId: p.receiverId,
        amount: p.amount,
        status: p.status,
        createdAt: Date.parse(p.createdAt),
      })),
  })

  // 3) Active users
  const activeUsers = useMemo(() => {
    const members = groupDetailQuery.data?.members ?? []
    const list = members.map((m) => uiUserFromID(m.userId))
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

  // 5) Handlers
  const handleCreateGroup = async (name: string) => {
    const created = await api.createGroup(name)
    await qc.invalidateQueries({ queryKey: ['groups'] })
    setCurrentGroupId(created.id)
    setIsCreateGroupOpen(false)
  }

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!effectiveGroupId) return
    await api.createExpense(effectiveGroupId, expenseData)
    await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!effectiveGroupId) return
    if (!confirm('Delete this? Balances will be recalculated.')) return
    await api.deleteExpense(expenseId)
    await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
  }

  const handlePaymentSubmit = async (payeeId: string, amount: number) => {
    if (!effectiveGroupId) return
    await api.createPayment(effectiveGroupId, payeeId, amount)
    await qc.invalidateQueries({ queryKey: ['payments', 'pending'] })
  }

  const handleReviewPayment = async (paymentId: string, status: Payment['status']) => {
    if (!effectiveGroupId) return
    if (status === 'approved') await api.approvePayment(paymentId)
    if (status === 'rejected') await api.rejectPayment(paymentId)
    await qc.invalidateQueries({ queryKey: ['payments', 'pending'] })
    await qc.invalidateQueries({ queryKey: ['expenses', effectiveGroupId] })
    await qc.invalidateQueries({ queryKey: ['balances', effectiveGroupId] })
  }

  const openAddModal = (mode: AddModalMode) => {
    setAddModalMode(mode)
    setIsAddModalOpen(true)
  }

  const handleGenerateInvite = async (groupId: string) => {
    const result = await api.createInvite(groupId)
    return result
  }

  const pendingCount = payments.filter((p) => p.receiverId === currentUser.id && p.status === 'pending').length

  return (
    <>
      <Fonts />
      <AppShell
        currentUser={currentUser}
        onMenuClick={() => setIsMenuOpen(true)}
        currentGroup={currentGroup}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notificationCount={pendingCount}
        onCentralAdd={() => openAddModal('expense')}
        onOpenMembers={() => setIsMembersModalOpen(true)}
        onOpenMyQr={() => setIsMyQrModalOpen(true)}
        onOpenInvite={() => setIsInviteModalOpen(true)}
        onLogout={logout}
        sidebar={
          <SideMenuContent
            groups={(groupsQuery.data ?? []).map((g) => ({
              id: g.id,
              name: g.name,
              members: [],
              createdAt: Date.parse(g.createdAt),
            }))}
            currentGroupId={currentGroup?.id}
            onSelectGroup={(g) => setCurrentGroupId(g.id)}
            onCreateGroup={() => setIsCreateGroupOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
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
            onPayClick={(uid, amt) => setPayModal({ open: true, payeeId: uid, amount: amt })}
            onDeleteExpense={handleDeleteExpense}
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
      </AppShell>

      {/* Modals & Overlays */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        groups={(groupsQuery.data ?? []).map((g) => ({ id: g.id, name: g.name, members: [], createdAt: Date.parse(g.createdAt) }))}
        currentGroupId={currentGroup?.id}
        onSelectGroup={(g) => setCurrentGroupId(g.id)}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        currentUser={currentUser}
      />

      {isCreateGroupOpen && (
        <CreateGroupModal isOpen onClose={() => setIsCreateGroupOpen(false)} onConfirm={handleCreateGroup} />
      )}

      {isProfileOpen && (
        <ProfileModal isOpen onClose={() => setIsProfileOpen(false)} currentUser={currentUser} onUpdateProfile={() => {}} />
      )}

      {isAddModalOpen && (
        <AddExpenseModal
          isOpen
          initialMode={addModalMode}
          onClose={() => setIsAddModalOpen(false)}
          currentUser={currentUser}
          activeUsers={activeUsers}
          onAdd={handleAddExpense}
        />
      )}

      {payModal.open && (
        <PaymentModal
          isOpen
          onClose={() => setPayModal((p) => ({ ...p, open: false }))}
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
          onClose={() => setIsMembersModalOpen(false)}
          activeUsers={activeUsers}
          balances={balances}
        />
      )}

      {isMyQrModalOpen && <MyQrModal isOpen onClose={() => setIsMyQrModalOpen(false)} currentUser={currentUser} />}

      {isInviteModalOpen && currentGroup && (
        <ShareInviteModal
          isOpen
          onClose={() => setIsInviteModalOpen(false)}
          groupId={currentGroup.id}
          groupName={currentGroup.name}
          onGenerateInvite={handleGenerateInvite}
        />
      )}
    </>
  )
}

