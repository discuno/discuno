'use client'

import { HelpCircle, LayoutDashboard, LogOut, Moon, Sun, User } from 'lucide-react'
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
import { authClient } from '~/lib/auth-client'

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
  const { resolvedTheme, setTheme } = useTheme()

  if (!isAuthenticated) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Open account menu"
        >
          <Avatar className="border-border h-9 w-9 border">
            <AvatarImage src={profilePic ?? undefined} alt="Your profile" />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {onboardingStatus && !onboardingStatus.isComplete && (
            <span
              className="bg-warning ring-background absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2"
              aria-label="Mentor setup incomplete"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-xl p-2" align="end" sideOffset={8}>
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Your account
        </DropdownMenuLabel>
        {onboardingStatus && (
          <DropdownMenuItem asChild>
            <Link href="/settings" className="gap-3 py-2.5">
              <LayoutDashboard />
              <span className="flex-1">Mentor dashboard</span>
              {!onboardingStatus.isComplete && (
                <span className="text-warning text-xs font-semibold">Finish setup</span>
              )}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/support" className="gap-3 py-2.5">
            <HelpCircle />
            Help and support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-3 py-2.5"
          onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          {resolvedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive gap-3 py-2.5"
          onSelect={async event => {
            event.preventDefault()
            try {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push('/')
                    router.refresh()
                  },
                },
              })
            } catch (error) {
              console.error('Sign out error:', error)
              router.push('/')
              router.refresh()
            }
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
