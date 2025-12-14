import { X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
}

export function CreateGroupModal({ isOpen, onClose, onConfirm }: Props) {
  const [groupName, setGroupName] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-6 border-b border-white/10 bg-[#1c1c21] flex justify-between items-center">
          <h3 className="font-display text-xl font-bold text-white">New Trip Group</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-[10px] uppercase text-gray-500 font-mono mb-2 block tracking-wider">Group Name</label>
            <input
              autoFocus
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Siargao 2025"
              className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#dfff4f]"
            />
          </div>
          <button
            disabled={!groupName}
            onClick={() => {
              onConfirm(groupName)
              setGroupName('')
            }}
            className="w-full bg-[#dfff4f] text-black font-bold font-mono py-4 rounded-xl acid-border hover:bg-[#ccee3e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CREATE GROUP
          </button>
        </div>
      </div>
    </div>
  )
}

