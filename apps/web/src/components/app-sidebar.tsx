import Link from 'next/link'
import * as React from 'react'
import { getFullProfileAction } from '~/app/(app)/(mentor)/settings/actions'
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
  const navMain: NavMainProps['items'] = [
    {
      title: 'Home',
      url: '/',
      icon: 'Home',
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: 'Settings2',
      items: [
        {
          title: 'Profile',
          url: '/settings/profile/edit',
          icon: 'User',
        },
        {
          title: 'Availability',
          url: '/settings/availability',
          icon: 'Calendar',
        },
        {
          title: 'Event Types',
          url: '/settings/event-types',
          icon: 'BookOpen',
        },
        {
          title: 'Bookings',
          url: '/settings/bookings',
          icon: 'CalendarCheck',
        },
        {
          title: 'Billing',
          url: '/settings/billing',
          icon: 'CreditCard',
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
