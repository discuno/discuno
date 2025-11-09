import { SettingsHeader } from '~/app/(app)/(mentor)/settings/components/SettingsHeader'
import { AppSidebar } from '~/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { requirePermission } from '~/lib/auth/auth-utils'

const SettingsLayout = async ({ children }: { children: React.ReactNode }) => {
  // Optional UI convenience - provides early redirect for better UX
  // REAL SECURITY: Enforced at data access layer (apps/web/src/server/queries/)
  // All query functions check mentor permission before returning data
  await requirePermission({ mentor: ['manage'] })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SettingsHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default SettingsLayout
