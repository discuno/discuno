'use client'

import Link from 'next/link'
import { ThemeAwareIconLogo } from '~/components/shared/ThemeAwareIconLogo'
import { SidebarMenuButton, useSidebar } from '~/components/ui/sidebar'

export const AppSidebarHeader = () => {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenuButton size="lg" asChild>
      <Link href="/" onClick={handleClick}>
        <div className="bg-background text-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
          <ThemeAwareIconLogo />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">Discuno</span>
          <span className="truncate text-xs">Mentor Dashboard</span>
        </div>
      </Link>
    </SidebarMenuButton>
  )
}
