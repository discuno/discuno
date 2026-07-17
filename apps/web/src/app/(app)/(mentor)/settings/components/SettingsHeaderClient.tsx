'use client'

import { PanelLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { useSidebar } from '~/components/ui/sidebar'
import { StripeDashboardButton } from './StripeDashboardButton'

const routeLabels: Record<string, string> = {
  '/settings': 'Mentor workspace',
  '/settings/calendar': 'Calendar connection',
  '/settings/availability': 'Availability',
  '/settings/event-types': 'Session types',
  '/settings/bookings': 'Bookings',
  '/settings/profile': 'Public profile',
  '/settings/profile/edit': 'Public profile',
}

interface SettingsHeaderClientProps {
  hasStripeAccount: boolean
  payoutsReady: boolean
}

export function SettingsHeaderClient({
  hasStripeAccount,
  payoutsReady,
}: SettingsHeaderClientProps) {
  const { toggleSidebar } = useSidebar()
  const pathname = usePathname()
  const isWorkspaceRoot = pathname === '/settings'
  const fallbackSegment = pathname.split('/').filter(Boolean).at(-1) ?? 'settings'
  const currentLabel =
    routeLabels[pathname] ??
    fallbackSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 flex w-full items-center border-b backdrop-blur">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:px-6">
        <Button
          className="h-8 w-8 md:hidden"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Open mentor navigation"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              {isWorkspaceRoot ? (
                <BreadcrumbPage className="truncate font-medium">Mentor workspace</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href="/settings" />} className="truncate">
                  Mentor workspace
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!isWorkspaceRoot && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium">{currentLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <StripeDashboardButton hasStripeAccount={hasStripeAccount} payoutsReady={payoutsReady} />
      </div>
    </header>
  )
}
