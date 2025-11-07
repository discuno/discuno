'use client'

import { HelpCircle, Info, LayoutDashboard, LogIn, Moon, Settings, Sun, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { StatusDot } from '~/components/ui/status-dot'
import { authClient } from '~/lib/auth-client'

const AvatarPic = ({
  profilePic,
  showStatusDot,
  isActive,
}: {
  profilePic: string | null
  showStatusDot?: boolean
  isActive?: boolean
}) => {
  return (
    <div className="relative h-10 w-10">
      <Avatar>
        <AvatarImage src={profilePic ?? undefined} alt="Profile Picture" width={40} height={40} />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      {showStatusDot && (
        <div className="absolute -top-1 -right-0.5">
          <StatusDot status={isActive ? 'active' : 'inactive'} size="md" />
        </div>
      )}
    </div>
  )
}

interface AvatarIconProps {
  profilePic: string | null
  isAuthenticated?: boolean
  onboardingStatus?: { isComplete: boolean } | null
}

export const AvatarIcon = ({
  profilePic,
  isAuthenticated = false,
  onboardingStatus,
}: AvatarIconProps) => {
  const router = useRouter()
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
            <AvatarPic
              profilePic={profilePic}
              showStatusDot={!!onboardingStatus}
              isActive={onboardingStatus?.isComplete ?? false}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/settings">
            <DropdownMenuItem>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </div>
                {onboardingStatus && !onboardingStatus.isComplete && (
                  <StatusDot status="inactive" size="sm" />
                )}
              </div>
            </DropdownMenuItem>
          </Link>
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
                await authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push('/auth')
                    },
                  },
                })
              } catch (error) {
                console.error('Sign out error:', error)
                // Fallback redirect
                router.push('/auth')
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
