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
  SidebarRail,
} from '~/components/ui/sidebar'
import { Skeleton } from '~/components/ui/skeleton'

const workspaceNavItems: NavMainProps['items'] = [
  {
    title: 'Workspace',
    url: '#',
    icon: 'Settings2',
    sectionLabel: 'Workspace',
    items: [
      {
        title: 'Bookings',
        url: '/settings/bookings',
        icon: 'CalendarCheck',
      },
      {
        title: 'Availability',
        url: '/settings/availability',
        icon: 'CalendarDays',
      },
      {
        title: 'Sessions',
        url: '/settings/event-types',
        icon: 'BookOpen',
      },
      {
        title: 'Public profile',
        url: '/settings/profile/edit',
        icon: 'User',
      },
    ],
  },
  {
    title: 'Connections',
    url: '#',
    icon: 'Settings2',
    sectionLabel: 'Connections',
    items: [
      {
        title: 'Calendar',
        url: '/settings/calendar',
        icon: 'Calendar',
      },
    ],
  },
]

const backToDiscunoItem: NavMainProps['items'][number] = {
  title: 'Back to Discuno',
  url: '/',
  icon: 'ArrowLeft',
}

// Dynamic component that fetches user-specific data
const DynamicSidebarContent = async () => {
  await connection()

  const user = await getFullProfileAction()
  const onboardingStatus = await getMentorOnboardingStatus()

  const navMain: NavMainProps['items'] = [
    {
      title: 'Overview',
      url: '/settings',
      icon: 'Rocket',
      badge: onboardingStatus.isComplete
        ? undefined
        : `${onboardingStatus.completedSteps}/${onboardingStatus.totalSteps}`,
      badgeVariant: 'secondary',
      isOnboarding: !onboardingStatus.isComplete,
    },
    ...workspaceNavItems,
  ]

  return (
    <>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavMain items={[backToDiscunoItem]} />
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
        <div className="flex flex-col gap-2 p-2">
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
    <Sidebar variant="inset" collapsible="icon" {...props}>
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
      <SidebarRail />
    </Sidebar>
  )
}
