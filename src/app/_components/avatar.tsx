"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { signOut } from "next-auth/react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ModeToggle } from "~/app/_components/theme-toggle";

const AvatarPic = ({ profilePic }: { profilePic: string }) => {
  return (
    <div className="h-10 w-10">
      <Avatar>
        <AvatarImage src={profilePic} alt="Profile Picture" />
        <AvatarFallback>ME</AvatarFallback>
      </Avatar>
    </div>
  );
};

export function AvatarIcon({ profilePic }: { profilePic: string }) {
  return (
    <div className="flex flex-row items-center justify-end space-x-4">
      <ModeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full focus:ring-2 focus:ring-primary"
            aria-label="User menu"
          >
            <AvatarPic profilePic={profilePic} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-md bg-white shadow-lg dark:bg-gray-800">
          <DropdownMenuLabel className="text-gray-700 dark:text-gray-200">
            Quick Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/view-profile">
            <DropdownMenuItem className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              View Profile
            </DropdownMenuItem>
          </Link>
          <Link href="/notifications">
            <DropdownMenuItem className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              Notifications
            </DropdownMenuItem>
          </Link>
          <Link href="/messages">
            <DropdownMenuItem className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              Messages
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <Link href="/email-verification">
            <DropdownMenuItem className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              Become a Mentor
            </DropdownMenuItem>
          </Link>
          <Link href="/help">
            <DropdownMenuItem className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              Help Center
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              signOut({ callbackUrl: "/" });
            }}
            className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
