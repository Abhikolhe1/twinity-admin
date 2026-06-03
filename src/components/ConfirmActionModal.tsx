'use client'

import { Loader2, X } from 'lucide-react'

type ConfirmActionModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'danger' | 'default'
  loading?: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'default',
  loading = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null

  const confirmClass = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : ''

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

        <div className="flex gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-brand-purple/20 px-4 py-2.5 text-sm font-semibold text-content-secondary transition-colors hover:bg-surface-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60 ${confirmClass}`}
            style={tone === 'danger' ? undefined : { background: 'linear-gradient(135deg,#9a78fe,#422266)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
