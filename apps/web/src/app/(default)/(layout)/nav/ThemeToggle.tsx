'use client'

import * as React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

export const ModeToggle = () => {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="focus:ring-primary h-10 w-10 rounded-full focus:ring-2"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 fill-current text-yellow-500 dark:hidden" />
          <Moon className="hidden h-5 w-5 fill-current text-gray-500 dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-md bg-white shadow-lg dark:bg-gray-800">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
