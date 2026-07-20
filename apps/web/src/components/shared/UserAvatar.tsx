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
  isMentor?: boolean
}

export const AvatarIcon = ({
  profilePic,
  isAuthenticated = false,
  isMentor = false,
}: AvatarIconProps) => {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  if (!isAuthenticated) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label="Open account menu"
          />
        }
      >
        <Avatar className="border-border h-9 w-9 border">
          <AvatarImage src={profilePic ?? undefined} alt="Your profile" />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-xl p-2" align="end" sideOffset={8}>
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
          Your account
        </DropdownMenuLabel>
        {isMentor && (
          <DropdownMenuItem render={<Link href="/settings" className="gap-3 py-2.5" />}>
            <LayoutDashboard />
            <span className="flex-1">Open workspace</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/support" className="gap-3 py-2.5" />}>
          <HelpCircle />
          Help and support
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-3 py-2.5"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          {resolvedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="gap-3 py-2.5"
          onClick={async () => {
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
