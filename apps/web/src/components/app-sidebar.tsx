import Link from 'next/link'
import * as React from 'react'
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

export const AppSidebar = async ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const user = await getFullProfileAction()
  const onboardingStatus = await getMentorOnboardingStatus()

  const navMain: NavMainProps['items'] = [
    {
      title: 'Home',
      url: '/',
      icon: 'ArrowLeft',
    },
    {
      title: onboardingStatus.isComplete ? 'Profile Settings' : 'Activate Profile',
      url: '/settings',
      icon: 'Rocket',
      badge: onboardingStatus.isComplete ? undefined : 'Inactive',
      badgeVariant: onboardingStatus.isComplete ? undefined : 'destructive',
      isOnboarding: !onboardingStatus.isComplete,
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
        {
          title: 'Billing',
          url: '/settings/billing',
          icon: 'CreditCard',
          description: 'Manage payments',
        },
      ],
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
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
                  <span className="truncate text-xs">Mentor</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
