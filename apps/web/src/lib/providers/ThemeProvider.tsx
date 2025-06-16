'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export const ThemeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) => {
  return (
    <NextThemesProvider enableColorScheme={false} storageKey="discuno-theme" {...props}>
      {children}
    </NextThemesProvider>
  )
}
