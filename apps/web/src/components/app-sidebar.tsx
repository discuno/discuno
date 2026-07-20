import { connection } from 'next/server'
import { Suspense } from 'react'
import { getFullProfileAction } from '~/app/(app)/(mentor)/settings/actions'
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
    title: 'Today',
    url: '/settings',
    icon: 'House',
  },
  {
    title: 'Sessions',
    url: '/settings/bookings',
    icon: 'CalendarCheck',
  },
  {
    title: 'Availability',
    url: '/settings/availability',
    icon: 'CalendarDays',
  },
  {
    title: 'Session types',
    url: '/settings/event-types',
    icon: 'BookOpen',
  },
  {
    title: 'Public profile',
    url: '/settings/profile',
    icon: 'User',
  },
  {
    title: 'Calendar',
    url: '/settings/calendar',
    icon: 'Calendar',
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

  return (
    <>
      <SidebarContent>
        <NavMain items={workspaceNavItems} />
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
          {workspaceNavItems.map(item => (
            <Skeleton key={item.url} className="h-10 w-full" />
          ))}
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppSidebarHeader />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <Suspense fallback={<SidebarContentSkeleton />}>
        <DynamicSidebarContent />
      </Suspense>
      <SidebarRail />
    </Sidebar>
  )
}
