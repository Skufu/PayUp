import { AlertCircle, Camera, CheckCircle, MoreHorizontal, QrCode, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { api } from '../../api/endpoints'
import type { ApiError } from '../../api/client'
import type { User } from '../../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUser: User
  onUpdateProfile: () => void
}

export function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile }: Props) {
  const [name, setName] = useState(currentUser.name)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrPreview, setQrPreview] = useState<string>(currentUser.qr)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const hasQR = useMemo(() => !!(qrPreview && qrPreview.trim()), [qrPreview])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        <div className="relative h-32 bg-gradient-to-b from-[#1c1c21] to-[#131316]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm z-10"
          >
            <X size={20} />
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div
              className={`w-24 h-24 rounded-full ${avatarPreview ? '' : currentUser.color} flex items-center justify-center text-4xl font-bold text-black border-[6px] border-[#131316] shadow-xl overflow-hidden cursor-pointer`}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                currentUser.avatar
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 bg-[#dfff4f] rounded-full text-black hover:scale-110 transition-transform shadow-lg border border-[#131316]"
            >
              <Camera size={14} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="pt-14 pb-8 px-6 text-center">
          <div className="mb-8">
            <label className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-1 block">Display Name</label>
            <div className="flex items-center justify-center gap-2 relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-center text-2xl font-bold text-white focus:outline-none focus:border-b focus:border-[#dfff4f] w-full max-w-[200px] pb-1"
              />
              <MoreHorizontal size={16} className="text-gray-600 absolute right-4" />
            </div>
          </div>

          <div className="bg-[#0a0a0c] rounded-2xl p-6 border border-white/5 mb-6 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#dfff4f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-mono text-gray-400 mb-4 flex items-center justify-center gap-2">
              <QrCode size={14} /> YOUR GCASH QR
            </h3>
            <div
              className="w-48 h-48 mx-auto bg-white p-4 rounded-xl mb-4 relative shadow-lg cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasQR ? (
                <img src={qrPreview} alt="QR" className="w-full h-full mix-blend-multiply object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                  <Upload size={28} className="mb-2" />
                  <span className="text-xs font-mono">Upload QR</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer backdrop-blur-[2px]">
                <Upload size={24} className="text-white mb-2" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{hasQR ? 'Change QR' : 'Upload QR'}</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!file.type.startsWith('image/')) return
                if (file.size > 5 * 1024 * 1024) return
                setQrFile(file)
                const reader = new FileReader()
                reader.onload = () => setQrPreview(String(reader.result ?? ''))
                reader.readAsDataURL(file)
              }}
            />

            <p className="text-[10px] text-gray-500 mt-2">Upload JPG/PNG/WEBP (max 5MB). Stored securely in Cloudinary.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-[#ff4f99]/10 border border-[#ff4f99]/20 rounded-xl flex items-start gap-2 text-sm text-[#ff4f99]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-[#dfff4f]/10 border border-[#dfff4f]/20 rounded-xl flex items-center gap-2 text-sm text-[#dfff4f]">
              <CheckCircle size={16} className="shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              console.log('[ProfileModal] Button clicked!')
              console.log('[ProfileModal] Current state - saving:', saving, 'name:', name)
              setError(null)
              setSuccess(false)
              setSaving(true)
              
              const doSave = async () => {
                try {
                  await api.updateProfile(name, qrFile ?? undefined, avatarFile ?? undefined)
                  await onUpdateProfile()
                  setSuccess(true)
                  setTimeout(() => onClose(), 800)
                } catch (ex: unknown) {
                  const apiErr = ex as ApiError
                  setError(apiErr?.message || (ex instanceof Error ? ex.message : 'Failed to update profile'))
                } finally {
                  setSaving(false)
                }
              }
              void doSave()
            }}
            className="w-full py-4 bg-[#1c1c21] hover:bg-[#dfff4f] hover:text-black border border-white/10 rounded-xl font-bold font-mono transition-all uppercase tracking-widest acid-border disabled:opacity-50"
          >
            {saving ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

