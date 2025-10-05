'use client'

import { HelpCircle, Info, LayoutDashboard, LogIn, Moon, Settings, Sun, User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

const AvatarPic = ({ profilePic }: { profilePic: string | null }) => {
  return (
    <div className="h-10 w-10">
      <Avatar>
        <AvatarImage src={profilePic ?? undefined} alt="Profile Picture" width={40} height={40} />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
}

interface AvatarIconProps {
  profilePic: string | null
  isAuthenticated?: boolean
}

export const AvatarIcon = ({ profilePic, isAuthenticated = false }: AvatarIconProps) => {
  // Show login button for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex flex-row items-center justify-end space-x-4">
        <SettingsDropdown />
        <Button asChild variant="default" size="sm">
          <Link href="/auth" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Mentor Sign In
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center justify-end space-x-4">
      <SettingsDropdown />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="focus:ring-primary h-10 w-10 rounded-full focus:ring-2"
            aria-label="User menu"
          >
            <AvatarPic profilePic={profilePic} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <Link href="/settings/profile/edit">
                  <DropdownMenuItem>
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/availability">
                  <DropdownMenuItem>
                    <span>Availability</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/event-types">
                  <DropdownMenuItem>
                    <span>Event Types</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/bookings">
                  <DropdownMenuItem>
                    <span>Bookings</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/billing">
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <Link href="/support">
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Support
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              try {
                await signOut({ callbackUrl: '/auth' })
              } catch (error) {
                console.error('Sign out error:', error)
                // Fallback redirect
                window.location.href = '/auth'
              }
            }}
            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const SettingsDropdown = () => {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" className="h-10 w-10">
          <Settings className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Help</DropdownMenuLabel>
        <Link href="/support">
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Support</span>
          </DropdownMenuItem>
        </Link>
        <Link href="/about">
          <DropdownMenuItem>
            <Info className="mr-2 h-4 w-4" />
            <span>About Us</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'light' ? (
            <>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
