'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import CelebrityProfileStepper from '@/components/celebrity/CelebrityProfileStepper'

export default function CelebrityProfileAdminPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'view'

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-content-muted">
          <Link href="/celebrities" className="transition-colors hover:text-brand-purple">
            Celebrities
          </Link>
          <span>/</span>
          <span className="text-content-primary">{mode === 'edit' ? 'Edit Profile' : 'View Profile'}</span>
        </div>
      </div>

      <CelebrityProfileStepper
        scope="admin"
        celebrityId={params.id}
        readOnly={mode !== 'edit'}
      />
    </div>
  )
}
