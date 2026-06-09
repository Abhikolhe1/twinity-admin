'use client'

import CelebrityProfileStepper from '@/components/celebrity/CelebrityProfileStepper'

export default function ManagerCreateCelebrityPage() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">Manager Workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-content-primary">Add Celebrity</h1>
        <p className="mt-2 text-sm leading-6 text-content-muted">
          Complete the celebrity profile directly here. On the first save we will create the celebrity, assign them to this manager, and send celebrity portal credentials automatically.
        </p>
      </div>

      <CelebrityProfileStepper scope="manager" />
    </div>
  )
}
