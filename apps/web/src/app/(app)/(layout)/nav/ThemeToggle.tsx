'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'

export const ModeToggle = () => {
  const { setTheme, resolvedTheme } = useTheme()
  // Check if we're mounted on the client (avoids hydration mismatch)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  // Avoid hydration mismatch by waiting until mounted
  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-primary inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        disabled
      >
        <Sun className="h-5 w-5 opacity-0" />
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-primary relative inline-flex h-10 w-10 items-center justify-center rounded-full p-0 transition-transform duration-200 hover:scale-[1.05] focus-visible:ring-2 focus-visible:outline-none active:scale-95"
    >
      {/* Sun for light mode */}
      <Sun className="h-5 w-5 scale-100 rotate-0 transition-all duration-200 dark:scale-0 dark:-rotate-90" />
      {/* Moon for dark mode */}
      <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all duration-200 dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
