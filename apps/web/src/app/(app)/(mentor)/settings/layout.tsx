import { redirect } from 'next/navigation'
import { SettingsHeader } from '~/app/(app)/(mentor)/settings/components/SettingsHeader'
import { AppSidebar } from '~/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { requirePermission } from '~/lib/auth/auth-utils'
import { UnauthenticatedError, UnauthorizedError } from '~/lib/errors'

const SettingsLayout = async ({ children }: { children: React.ReactNode }) => {
  // Optional UI convenience - provides early redirect for better UX
  // REAL SECURITY: Enforced at data access layer (apps/web/src/server/queries/)
  // All query functions check mentor permission before returning data
  try {
    await requirePermission({ mentor: ['manage'] })
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect('/auth?intent=mentor')
    if (error instanceof UnauthorizedError) redirect('/for-mentors?school-email-required=1')
    throw error
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <SettingsHeader />
        <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default SettingsLayout
