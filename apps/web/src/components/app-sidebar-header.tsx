'use client'

import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { SidebarMenuButton, useSidebar } from '~/components/ui/sidebar'

export const AppSidebarHeader = () => {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenuButton size="lg" render={<Link href="/" onClick={handleClick} />}>
      <div className="bg-primary text-primary-foreground border-foreground/20 flex aspect-square size-8 items-center justify-center rounded-md border shadow-[2px_2px_0_rgba(13,20,39,0.18)]">
        <IconLogo className="h-4 w-6" aria-hidden="true" />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="font-display truncate text-base leading-none font-semibold">Discuno</span>
        <span className="truncate text-xs">Mentor workspace</span>
      </div>
    </SidebarMenuButton>
  )
}
