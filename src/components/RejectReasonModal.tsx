'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

type RejectReasonModalProps = {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
  onClose: () => void
  onSubmit: (reason: string) => Promise<void> | void
}

export default function RejectReasonModal({
  open,
  title = 'Reject Request',
  message = 'Add a reason before rejecting this item.',
  confirmLabel = 'Submit Rejection',
  loading = false,
  onClose,
  onSubmit,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError('')
    }
  }, [open])

  if (!open) return null

  async function handleSubmit() {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Reject reason is required')
      return
    }
    setError('')
    await onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-brand-purple/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-content-primary">{title}</h2>
            <p className="mt-1 text-sm text-content-muted">{message}</p>
          </div>
          <button onClick={onClose} className="text-content-muted transition-colors hover:text-content-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="mb-1.5 block text-sm font-semibold text-content-primary">Reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-brand-purple/20 bg-white px-3 py-2.5 text-sm text-content-primary outline-none transition-all focus:border-brand-purple"
            placeholder="Write the reason clearly..."
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-brand-purple/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-brand-purple/20 px-4 py-2.5 text-sm font-semibold text-content-secondary transition-colors hover:bg-surface-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
