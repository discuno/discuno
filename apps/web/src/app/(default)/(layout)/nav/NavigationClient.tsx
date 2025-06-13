'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '~/lib/utils'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '~/components/ui/navigation-menu'

export function NavBarBase({ profilePic, isMentor }: { profilePic: string; isMentor: boolean }) {
  return (
    <div className="border/40 bg-background/80 text-foreground backdrop-blur-xs fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b p-4 transition-colors duration-300">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Find Mentors</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                <li className="row-span-3">
                  <NavigationMenuLink asChild>
                    <Link
                      className="from-primary/10 to-primary/5 hover:bg-primary/10 dark:from-primary/20 dark:to-primary/10 dark:hover:bg-primary/20 bg-linear-to-b outline-hidden flex h-full w-full select-none flex-col justify-end rounded-md p-6 no-underline transition-colors focus:shadow-md"
                      href="/browse"
                    >
                      <div className="text-foreground mb-2 mt-4 text-lg font-medium">Browse Mentors</div>
                      <p className="text-muted-foreground text-sm leading-tight">
                        Find college students who match your interests and goals
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </li>
                <ListItem href="/search/schools" title="Search by School">
                  Find mentors from specific colleges and universities
                </ListItem>
                <ListItem href="/search/majors" title="Search by Major">
                  Connect with students in your intended field of study
                </ListItem>
                <ListItem href="/search/interests" title="Search by Interests">
                  Discover mentors who share your passions
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                <ListItem href="/guides/application" title="Application Guide">
                  Step-by-step guide to college applications
                </ListItem>
                <ListItem href="/guides/essays" title="Essay Writing">
                  Tips for writing compelling college essays
                </ListItem>
                <ListItem href="/guides/interviews" title="Interview Prep">
                  Prepare for college interviews
                </ListItem>
                <ListItem href="/guides/financial-aid" title="Financial Aid">
                  Understanding scholarships and aid options
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>My Account</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                <ListItem href="/dashboard" title="Dashboard">
                  View your mentorship connections and messages
                </ListItem>
                <ListItem href="/meetings" title="My Meetings">
                  Manage your scheduled video meetings
                </ListItem>
                <ListItem href="/profile/edit" title="Edit Profile">
                  Update your profile information
                </ListItem>
                {isMentor && (
                  <ListItem href="/availability" title="Availability">
                    Set your available times for mentoring sessions
                  </ListItem>
                )}
                <ListItem href="/settings" title="Settings">
                  Adjust your account preferences
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <AvatarIcon profilePic={profilePic} />
    </div>
  )
}

interface ListItemProps extends React.ComponentPropsWithoutRef<'a'> {
  title: string
  className?: string
}

const ListItem = React.forwardRef<React.ElementRef<'a'>, ListItemProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              'outline-hidden block select-none space-y-1 rounded-md p-3 leading-none no-underline transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:bg-accent focus:text-accent-foreground focus:ring-primary focus:outline-hidden focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              className
            )}
            {...props}
          >
            <div className="text-foreground text-sm font-medium leading-none">{title}</div>
            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  }
)
ListItem.displayName = 'ListItem'
