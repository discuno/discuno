'use client'

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
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { StripeDashboardButton } from './StripeDashboardButton'

const routeLabels: Record<string, string> = {
  '/settings': 'Today',
  '/settings/calendar': 'Calendar',
  '/settings/availability': 'Availability',
  '/settings/event-types': 'Session types',
  '/settings/bookings': 'Sessions',
  '/settings/profile': 'Public profile',
  '/settings/profile/edit': 'Public profile',
}

interface SettingsHeaderClientProps {
  showPayoutAction: boolean
  hasStripeAccount: boolean
  payoutsReady: boolean
}

export function SettingsHeaderClient({
  showPayoutAction,
  hasStripeAccount,
  payoutsReady,
}: SettingsHeaderClientProps) {
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
    <header className="bg-background sticky top-0 z-40 flex w-full items-center border-b">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" aria-label="Toggle mentor navigation" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              {isWorkspaceRoot ? (
                <BreadcrumbPage className="truncate font-medium">Today</BreadcrumbPage>
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
        {showPayoutAction && (
          <StripeDashboardButton hasStripeAccount={hasStripeAccount} payoutsReady={payoutsReady} />
        )}
      </div>
    </header>
  )
}
