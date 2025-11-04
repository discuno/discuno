import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  getFullProfileAction,
  getMentorOnboardingStatus,
} from '~/app/(app)/(mentor)/settings/actions'
import { NavMain, type NavMainProps } from '~/components/nav-main'
import { NavUser } from '~/components/nav-user'
import { ThemeAwareIconLogo } from '~/components/shared/ThemeAwareIconLogo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { Skeleton } from '~/components/ui/skeleton'

// Static navigation items that don't depend on user data
const staticNavItems: NavMainProps['items'] = [
  {
    title: 'Home',
    url: '/',
    icon: 'ArrowLeft',
  },
  {
    title: 'Meeting Configuration',
    url: '#',
    icon: 'Settings2',
    sectionLabel: 'Meeting Setup',
    items: [
      {
        title: 'Availability',
        url: '/settings/availability',
        icon: 'Calendar',
        description: "Set when you're free",
      },
      {
        title: 'Event Types',
        url: '/settings/event-types',
        icon: 'BookOpen',
        description: 'Configure session types',
      },
    ],
  },
  {
    title: 'Manage',
    url: '#',
    icon: 'Settings2',
    sectionLabel: 'Manage',
    items: [
      {
        title: 'Profile',
        url: '/settings/profile/edit',
        icon: 'User',
        description: 'Edit your profile',
      },
      {
        title: 'Bookings',
        url: '/settings/bookings',
        icon: 'CalendarCheck',
        description: 'View your sessions',
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
    ...(homeItem ? [homeItem] : []),
    {
      title: onboardingStatus.isComplete ? 'Profile Settings' : 'Activate Profile',
      url: '/settings',
      icon: 'Rocket',
      statusDot: onboardingStatus.isComplete ? 'active' : 'inactive',
      isOnboarding: !onboardingStatus.isComplete,
    },
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
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-background text-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ThemeAwareIconLogo />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Discuno</span>
                  <span className="truncate text-xs">Mentor Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
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
