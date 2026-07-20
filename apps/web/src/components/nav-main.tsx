'use client'

import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarDays,
  House,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'

const iconMap = {
  ArrowLeft,
  User,
  Calendar,
  CalendarDays,
  BookOpen,
  CalendarCheck,
  House,
}

export type NavMainProps = {
  items: {
    title: string
    url: string
    icon: keyof typeof iconMap
  }[]
}

export function NavMain({ items }: NavMainProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()

  const handleClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const isCurrentPath = (url: string) =>
    pathname === url || (url !== '/settings' && url !== '/' && pathname.startsWith(`${url}/`))

  return (
    <SidebarMenu>
      {items.map(item => {
        const Icon = iconMap[item.icon]
        const isActive = isCurrentPath(item.url)

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              render={
                <Link
                  href={item.url}
                  onClick={handleClick}
                  aria-current={isActive ? 'page' : undefined}
                />
              }
              tooltip={item.title}
              isActive={isActive}
            >
              <Icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
