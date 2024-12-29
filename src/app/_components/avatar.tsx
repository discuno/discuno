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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
        >
          <AvatarPic profilePic={profilePic} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile">
          <DropdownMenuItem>View Profile</DropdownMenuItem>
        </Link>
        <Link href="/notifications">
          <DropdownMenuItem>Notifications</DropdownMenuItem>
        </Link>
        <Link href="/messages">
          <DropdownMenuItem>Messages</DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <Link href="/become-mentor">
          <DropdownMenuItem>Become a Mentor</DropdownMenuItem>
        </Link>
        <Link href="/help">
          <DropdownMenuItem>Help Center</DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            signOut({ callbackUrl: "/" });
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
