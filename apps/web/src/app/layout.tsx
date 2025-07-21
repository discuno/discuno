import '~/styles/globals.css'

import { GeistSans } from 'geist/font/sans'
import { type Metadata } from 'next'
import { Toaster } from 'sonner'
import { ThemeProvider } from '~/lib/providers/ThemeProvider'
import { QueryProvider } from '~/lib/react-query/QueryProvider'

export const metadata: Metadata = {
  title: 'Discuno - Your Guide to College Success',
  description:
    'Discover personalized advice, resources, and tools to help you get into your dream college.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logos/black-icon-logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

const RootLayout = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} theme-vercel-esque`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            {children}
            <Toaster
              theme="system"
              className="toaster group"
              toastOptions={{
                classNames: {
                  toast:
                    'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:shadow-lg',
                  description: 'group-[.toast]:text-muted-foreground',
                  actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                  cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
