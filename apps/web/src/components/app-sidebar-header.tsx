'use client'

import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { TextLogo } from '~/components/icons/TextLogo'
import { SidebarMenuButton, useSidebar } from '~/components/ui/sidebar'

export const AppSidebarHeader = () => {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenuButton size="lg" render={<Link href="/settings" onClick={handleClick} />}>
      <IconLogo className="text-primary size-7 shrink-0" aria-hidden="true" />
      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <TextLogo className="text-foreground h-4 w-auto" aria-hidden="true" />
        <span className="truncate text-xs">Mentor workspace</span>
      </div>
    </SidebarMenuButton>
  )
}
