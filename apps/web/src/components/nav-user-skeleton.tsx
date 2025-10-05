import { ChevronsUpDown } from 'lucide-react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar'
import { Skeleton } from '~/components/ui/skeleton'

export const NavUserSkeleton = () => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
