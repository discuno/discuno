'use client'

import { PanelLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { useSidebar } from '~/components/ui/sidebar'

// Map of paths to their display names
const pathMap: Record<string, string> = {
  settings: 'Settings',
  availability: 'Availability',
  'event-types': 'Event Types',
  profile: 'Profile',
  edit: 'Edit Profile',
  view: 'View Profile',
  billing: 'Billing',
}

export function SettingsHeader() {
  const { toggleSidebar } = useSidebar()
  const pathname = usePathname()

  // Generate breadcrumbs from the current path
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: Array<{ label: string; href?: string; isLast: boolean }> = []

    // Always start with Settings (no link since the route doesn't exist)
    breadcrumbs.push({
      label: 'Settings',
      href: undefined,
      isLast: false,
    })

    // Process the remaining segments after /settings
    const settingsIndex = segments.indexOf('settings')
    if (settingsIndex !== -1) {
      const remainingSegments = segments.slice(settingsIndex + 1)

      remainingSegments.forEach((segment, index) => {
        const isLast = index === remainingSegments.length - 1
        const label = pathMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)

        breadcrumbs.push({
          label,
          href: undefined, // No intermediate links needed for simple 2-level structure
          isLast,
        })
      })
    }

    // If we only have "Settings", mark it as last
    if (breadcrumbs.length === 1 && breadcrumbs[0]) {
      breadcrumbs[0].isLast = true
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-14 w-full items-center gap-2 px-4">
        {/* Show toggle button only on medium screens and below */}
        <Button
          className="h-8 w-8 md:hidden"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        {/* Show separator only when toggle button is visible */}
        <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
        {/* Breadcrumbs: always show full breadcrumbs */}
        <Breadcrumb className="flex-1">
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
