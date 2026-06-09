'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import CelebrityProfileStepper from '@/components/celebrity/CelebrityProfileStepper'

export default function ManagerCelebrityProfilePage() {
  const params = useParams<{ id: string }>()

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-content-muted">
          <Link href="/manager/celebrities" className="transition-colors hover:text-brand-purple">
            Add Celebrity
          </Link>
          <span>/</span>
          <span className="text-content-primary">Complete Profile</span>
        </div>
      </div>

      <CelebrityProfileStepper scope="manager" celebrityId={params.id} />
    </div>
  )
}
