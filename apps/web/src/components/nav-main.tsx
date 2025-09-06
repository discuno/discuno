'use client'

import { BookOpen, Calendar, CalendarCheck, CreditCard, Home, Settings2, User } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'

const iconMap = {
  Home,
  Settings2,
  User,
  Calendar,
  BookOpen,
  CreditCard,
  CalendarCheck,
}

export type NavMainProps = {
  items: {
    title: string
    url: string
    icon: keyof typeof iconMap
    disabled?: boolean
    items?: {
      title: string
      url: string
      icon: keyof typeof iconMap
      disabled?: boolean
    }[]
  }[]
}

export function NavMain({ items }: NavMainProps) {
  return (
    <>
      <SidebarMenu>
        {items
          .filter(item => !item.items)
          .map(item => {
            const Icon = iconMap[item.icon]
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url}>
                    <Icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
      </SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarMenu>
          {items
            .filter(item => item.items)
            .flatMap(item => item.items)
            .map(subItem => {
              if (!subItem) return null
              const SubIcon = iconMap[subItem.icon]
              return (
                <SidebarMenuItem key={subItem.title}>
                  {subItem.disabled ? (
                    <SidebarMenuButton
                      tooltip={`${subItem.title} - Complete Stripe setup to access`}
                      className="cursor-not-allowed opacity-50"
                      disabled
                    >
                      <SubIcon />
                      <span>{subItem.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild tooltip={subItem.title}>
                      <a href={subItem.url}>
                        <SubIcon />
                        <span>{subItem.title}</span>
                      </a>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
