'use client'

import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarCheck,
  CreditCard,
  Rocket,
  Settings2,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '~/components/ui/badge'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { StatusDot } from '~/components/ui/status-dot'

const iconMap = {
  ArrowLeft,
  Settings2,
  User,
  Calendar,
  BookOpen,
  CreditCard,
  CalendarCheck,
  Rocket,
}

export type NavMainProps = {
  items: {
    title: string
    url: string
    icon: keyof typeof iconMap
    disabled?: boolean
    badge?: string
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
    statusDot?: 'active' | 'inactive'
    isOnboarding?: boolean
    sectionLabel?: string
    description?: string
    items?: {
      title: string
      url: string
      icon: keyof typeof iconMap
      disabled?: boolean
      description?: string
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
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={item.isOnboarding && item.badge ? 'font-semibold' : ''}
                >
                  <Link href={item.url} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon />
                      <span>{item.title}</span>
                    </div>
                    {item.statusDot ? (
                      <span className="ml-auto p-1">
                        <StatusDot status={item.statusDot} size="sm" />
                      </span>
                    ) : (
                      item.badge && (
                        <Badge variant={item.badgeVariant ?? 'default'} className="ml-auto">
                          {item.badge}
                        </Badge>
                      )
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
      </SidebarMenu>
      {items
        .filter(item => item.items)
        .map(parentItem => (
          <SidebarGroup key={parentItem.title}>
            <SidebarGroupLabel>{parentItem.sectionLabel ?? parentItem.title}</SidebarGroupLabel>
            <SidebarMenu>
              {parentItem.items?.map(subItem => {
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
                        <div className="flex flex-col items-start">
                          <span>{subItem.title}</span>
                          {subItem.description && (
                            <span className="text-muted-foreground text-xs">
                              {subItem.description}
                            </span>
                          )}
                        </div>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild tooltip={subItem.title}>
                        <Link href={subItem.url}>
                          <SubIcon />
                          <div className="flex flex-col items-start">
                            <span>{subItem.title}</span>
                            {subItem.description && (
                              <span className="text-muted-foreground text-xs">
                                {subItem.description}
                              </span>
                            )}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
    </>
  )
}
