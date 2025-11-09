import '~/styles/globals.css'

import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { defaultMetadata } from '~/lib/metadata'
import { AnonymousAuthProvider } from '~/lib/providers/AnonymousAuthProvider'
import { PostHogProvider } from '~/lib/providers/PostHogProvider'
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
      <body className="bg-background text-foreground min-h-screen font-sans antialiased transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <PostHogProvider>
            <QueryProvider>
              <AnonymousAuthProvider>
                {children}
                <Toaster
                  theme="system"
                  className="toaster group"
                  toastOptions={{
                    classNames: {
                      toast:
                        'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:shadow-lg',
                      description: 'group-[.toast]:text-muted-foreground',
                      actionButton:
                        'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                      cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                    },
                  }}
                />
              </AnonymousAuthProvider>
            </QueryProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
