'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'

import { ModeToggle } from '~/app/(default)/(layout)/nav/ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

const AvatarPic = ({ profilePic }: { profilePic: string }) => {
  return (
    <div className="h-10 w-10">
      <Avatar>
        <AvatarImage src={profilePic} alt="Profile Picture" width={48} height={48} />
        <AvatarFallback>ME</AvatarFallback>
      </Avatar>
    </div>
  )
}

export const AvatarIcon = ({ profilePic }: { profilePic: string }) => {
  return (
    <div className="flex flex-row items-center justify-end space-x-4">
      <ModeToggle />
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
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/profile/view">
            <DropdownMenuItem>View Profile</DropdownMenuItem>
          </Link>
          <Link href="/notifications">
            <DropdownMenuItem>Notifications</DropdownMenuItem>
          </Link>
          <Link href="/messages">
            <DropdownMenuItem>Messages</DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <Link href="/email-verification">
            <DropdownMenuItem>Become a Mentor</DropdownMenuItem>
          </Link>
          <Link href="/help">
            <DropdownMenuItem>Help Center</DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut({ callbackUrl: '/' })
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
