import { AlertCircle, Camera, CheckCircle, Copy, QrCode, X, Trash2, Check, Loader2 } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

import { api, type PaymentQR } from '../../api/endpoints'
import type { ApiError } from '../../api/client'
import type { User } from '../../types'
import { PAYMENT_PROVIDERS } from '../../constants/PaymentProviders'
import { compressImage, formatFileSize } from '../../utils/imageCompression'

type Props = {
  isOpen: boolean
  onClose: () => void
  currentUser: User
  onUpdateProfile: () => void
}

export function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile }: Props) {
  const [name, setName] = useState(currentUser.name)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser.avatarUrl ?? '')

  // Payment QRs state
  const [userQRs, setUserQRs] = useState<PaymentQR[]>(currentUser.paymentQRs || [])
  const [uploadingQR, setUploadingQR] = useState<string | null>(null)
  // Phone number inputs per provider
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    currentUser.paymentQRs?.forEach(qr => {
      if (qr.phoneNumber) initial[qr.provider] = qr.phoneNumber
    })
    return initial
  })
  const [editingPhone, setEditingPhone] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const qrInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Sync QRs when currentUser changes
  useEffect(() => {
    if (currentUser.paymentQRs) {
      setUserQRs(currentUser.paymentQRs)
      // Also sync phone numbers
      const updated: Record<string, string> = {}
      currentUser.paymentQRs.forEach(qr => {
        if (qr.phoneNumber) updated[qr.provider] = qr.phoneNumber
      })
      setPhoneNumbers(updated)
    }
  }, [currentUser.paymentQRs])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    try {
      setCompressing(true)
      setError(null)
      console.log(`Original avatar: ${formatFileSize(file.size)}`)

      // Compress the image
      const compressedFile = await compressImage(file, 'avatar', setCompressionProgress)
      console.log(`Compressed avatar: ${formatFileSize(compressedFile.size)}`)

      setAvatarFile(compressedFile)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(String(reader.result ?? ''))
      reader.readAsDataURL(compressedFile)
    } catch (err) {
      console.error('Avatar compression error:', err)
      setError('Failed to process image')
    } finally {
      setCompressing(false)
      setCompressionProgress(0)
    }
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadingQR) return
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setCompressing(true)
      setError(null)
      console.log(`Original QR: ${formatFileSize(file.size)}`)

      // Compress the image
      const compressedFile = await compressImage(file, 'qr', setCompressionProgress)
      console.log(`Compressed QR: ${formatFileSize(compressedFile.size)}`)

      setCompressing(false)
      setSaving(true)
      const phoneNumber = phoneNumbers[uploadingQR]
      const newQR = await api.addPaymentQR(uploadingQR, compressedFile, phoneNumber || undefined)
      setUserQRs(prev => [...prev.filter(q => q.provider !== uploadingQR), newQR])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      setError('Failed to upload QR')
    } finally {
      setCompressing(false)
      setCompressionProgress(0)
      setSaving(false)
      setUploadingQR(null)
    }
  }

  const handleCopyPhone = async (provider: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(provider)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch {
      setError('Failed to copy')
    }
  }

  const handleDeleteQR = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment QR?')) return
    try {
      setSaving(true)
      await api.deletePaymentQR(id)
      setUserQRs(prev => prev.filter(q => q.id !== id))
    } catch {
      setError('Failed to delete QR')
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrimary = async (id: string) => {
    try {
      setSaving(true)
      await api.setPrimaryPaymentQR(id)
      setUserQRs(prev => prev.map(q => ({ ...q, isPrimary: q.id === id })))
    } catch {
      setError('Failed to set primary QR')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#131316] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-b from-[#1c1c21] to-[#131316] shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm z-10"
          >
            <X size={20} />
          </button>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <div
              className={`w-20 h-20 rounded-full ${avatarPreview ? '' : currentUser.color} flex items-center justify-center text-3xl font-bold text-black border-[4px] border-[#131316] shadow-xl overflow-hidden cursor-pointer relative`}
              onClick={() => !compressing && avatarInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : currentUser.avatar}
              {/* Compression overlay */}
              {compressing && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1">
                  <Loader2 size={20} className="animate-spin text-[#dfff4f]" />
                  <span className="text-[8px] text-white font-mono">{compressionProgress}%</span>
                </div>
              )}
            </div>
            <button
              onClick={() => !compressing && avatarInputRef.current?.click()}
              disabled={compressing}
              className="absolute bottom-0 right-0 p-1.5 bg-[#dfff4f] rounded-full text-black hover:scale-110 transition-transform shadow-lg border border-[#131316] disabled:opacity-50 disabled:hover:scale-100"
            >
              {compressing ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
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

        {/* Scrollable Content */}
        <div className="pt-10 pb-6 px-6 overflow-y-auto custom-scrollbar">
          <div className="text-center mb-6">
            <label className="text-[10px] uppercase text-gray-500 font-mono tracking-widest mb-1 block underline decoration-[#dfff4f]/30">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent text-center text-xl font-bold text-white focus:outline-none focus:border-b focus:border-[#dfff4f] w-full max-w-[180px] pb-1"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <QrCode size={12} /> Payment Methods
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {PAYMENT_PROVIDERS.map(provider => {
                const qr = userQRs.find(q => q.provider === provider.id)
                const isEditingPhone = editingPhone === provider.id
                return (
                  <div key={provider.id} className="bg-[#1c1c21] border border-white/5 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: provider.lightColor }}
                      >
                        {provider.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {provider.name}
                          {qr?.isPrimary && <span className="text-[8px] bg-[#dfff4f] text-black px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter">Primary</span>}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {qr ? 'QR Uploaded' : 'Not set up'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {qr ? (
                          <>
                            {!qr.isPrimary && (
                              <button
                                onClick={() => handleSetPrimary(qr.id)}
                                className="p-1.5 text-gray-500 hover:text-[#dfff4f] transition-colors"
                                title="Set as primary"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteQR(qr.id)}
                              className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadingQR(provider.id)
                              qrInputRef.current?.click()
                            }}
                            className="text-[10px] font-bold text-[#dfff4f] uppercase tracking-widest px-3 py-1.5 bg-[#dfff4f]/10 rounded-lg hover:bg-[#dfff4f]/20 transition-colors"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Phone Number Section - only show if QR is uploaded */}
                    {qr && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        {isEditingPhone ? (
                          <>
                            <input
                              type="tel"
                              placeholder="e.g. 09171234567"
                              value={phoneNumbers[provider.id] || ''}
                              onChange={(e) => setPhoneNumbers(prev => ({ ...prev, [provider.id]: e.target.value }))}
                              className="flex-1 bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#dfff4f]/50"
                            />
                            <button
                              onClick={() => setEditingPhone(null)}
                              className="p-1.5 text-[#dfff4f] hover:bg-[#dfff4f]/10 rounded-lg transition-colors"
                            >
                              <Check size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Mobile:</span>
                            {phoneNumbers[provider.id] || qr.phoneNumber ? (
                              <>
                                <span className="text-sm text-white font-mono">{phoneNumbers[provider.id] || qr.phoneNumber}</span>
                                <button
                                  onClick={() => handleCopyPhone(provider.id, phoneNumbers[provider.id] || qr.phoneNumber || '')}
                                  className="p-1 text-gray-500 hover:text-[#dfff4f] transition-colors"
                                  title="Copy number"
                                >
                                  {copiedPhone === provider.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-600 italic">Not set</span>
                            )}
                            <button
                              onClick={() => setEditingPhone(provider.id)}
                              className="ml-auto text-[9px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQrUpload}
            />
          </div>

          {/* Feedback Messages */}
          <div className="mt-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-[#dfff4f]/10 border border-[#dfff4f]/20 rounded-xl flex items-center gap-2 text-xs text-[#dfff4f]">
                <CheckCircle size={14} className="shrink-0" />
                <span>Updated!</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-[#0a0a0c]/50 backdrop-blur-sm border-t border-white/5 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setError(null)
              setSuccess(false)
              setSaving(true)
              try {
                // Save phone numbers for each QR that has changed
                for (const qr of userQRs) {
                  const newPhone = phoneNumbers[qr.provider]
                  const oldPhone = qr.phoneNumber || ''
                  if (newPhone !== undefined && newPhone !== oldPhone) {
                    await api.updatePaymentQRPhone(qr.id, newPhone)
                  }
                }
                // Save name and avatar
                await api.updateProfile(name, undefined, avatarFile ?? undefined)
                await onUpdateProfile()
                setSuccess(true)
                setTimeout(() => onClose(), 800)
              } catch (ex: unknown) {
                const apiErr = ex as ApiError
                setError(apiErr?.message || (ex instanceof Error ? ex.message : 'Failed to save changes'))
              } finally {
                setSaving(false)
              }
            }}
            className="w-full py-4 bg-[#1c1c21] hover:bg-[#dfff4f] hover:text-black border border-white/10 rounded-2xl font-bold font-mono transition-all uppercase tracking-widest acid-border disabled:opacity-50"
          >
            {saving ? 'Saving...' : success ? 'Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
