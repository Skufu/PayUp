import { Plus, Users } from 'lucide-react'

type Props = {
  onCreateGroup: () => void
  onJoinGroup: () => void
}

export function NoGroupsEmptyState({ onCreateGroup, onJoinGroup }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-[#131316] border border-white/10 flex items-center justify-center mb-6">
        <Users size={36} className="text-gray-600" />
      </div>

      <h2 className="text-xl font-bold text-white mb-2">No groups yet</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
        Create a group or join one with an invite code to start splitting expenses.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          onClick={onCreateGroup}
          className="flex-1 bg-[#dfff4f] text-black font-bold py-3.5 px-6 rounded-xl hover:bg-[#ccee3e] transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} />
          Create Group
        </button>
        <button
          onClick={onJoinGroup}
          className="flex-1 bg-white/5 text-white font-bold py-3.5 px-6 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-sm"
        >
          Join a Group
        </button>
      </div>
    </div>
  )
}
