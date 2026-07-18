import '~/styles/globals.css'

import '@fontsource-variable/newsreader/opsz.css'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Toaster } from '~/components/ui/sonner'
import { defaultMetadata } from '~/lib/metadata'
import { AnonymousAuthProvider } from '~/lib/providers/AnonymousAuthProvider'
import { ThemeProvider } from '~/lib/providers/ThemeProvider'
import { QueryProvider } from '~/lib/react-query/QueryProvider'

export const metadata: Metadata = defaultMetadata

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} theme-discuno`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-[100dvh] font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            <AnonymousAuthProvider>
              {children}
              <Toaster />
            </AnonymousAuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
