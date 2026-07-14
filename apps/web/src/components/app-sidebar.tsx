import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  getFullProfileAction,
  getMentorOnboardingStatus,
} from '~/app/(app)/(mentor)/settings/actions'
import { AppSidebarHeader } from '~/components/app-sidebar-header'
import { NavMain, type NavMainProps } from '~/components/nav-main'
import { NavUser } from '~/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { Skeleton } from '~/components/ui/skeleton'

// Static navigation items that don't depend on user data
const staticNavItems: NavMainProps['items'] = [
  {
    title: 'Back to Discuno',
    url: '/',
    icon: 'ArrowLeft',
  },
  {
    title: 'Mentoring',
    url: '#',
    icon: 'Settings2',
    sectionLabel: 'Mentoring',
    items: [
      {
        title: 'Bookings',
        url: '/settings/bookings',
        icon: 'CalendarCheck',
      },
      {
        title: 'Availability',
        url: '/settings/availability',
        icon: 'Calendar',
      },
      {
        title: 'Session types',
        url: '/settings/event-types',
        icon: 'BookOpen',
      },
    ],
  },
  {
    title: 'Profile',
    url: '#',
    icon: 'User',
    sectionLabel: 'Profile',
    items: [
      {
        title: 'Public profile',
        url: '/settings/profile/edit',
        icon: 'User',
      },
    ],
  },
]

// Dynamic component that fetches user-specific data
const DynamicSidebarContent = async () => {
  await connection()

  const user = await getFullProfileAction()
  const onboardingStatus = await getMentorOnboardingStatus()

  const homeItem = staticNavItems[0]
  const navMain: NavMainProps['items'] = [
    {
      title: onboardingStatus.isComplete ? 'Overview' : 'Setup checklist',
      url: '/settings',
      icon: 'Rocket',
      badge: onboardingStatus.isComplete
        ? undefined
        : `${onboardingStatus.completedSteps}/${onboardingStatus.totalSteps}`,
      badgeVariant: 'secondary',
      isOnboarding: !onboardingStatus.isComplete,
    },
    ...(homeItem ? [homeItem] : []),
    ...staticNavItems.slice(1), // Rest of the static items
  ]

  return (
    <>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </>
  )
}

// Skeleton for loading state
const SidebarContentSkeleton = () => {
  return (
    <>
      <SidebarContent>
        <div className="space-y-2 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className="h-12 w-full" />
      </SidebarFooter>
    </>
  )
}

// Main sidebar component using PPR
export const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  return (
    <Sidebar variant="inset" {...props}>
      {/* Static header - prerendered */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppSidebarHeader />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Dynamic content - streamed in at request time */}
      <Suspense fallback={<SidebarContentSkeleton />}>
        <DynamicSidebarContent />
      </Suspense>
    </Sidebar>
  )
}
