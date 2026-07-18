'use client'

import { ArrowRight, LayoutDashboard, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LoginModal } from '~/components/auth/LoginModal'
import { Brand } from '~/components/shared/Brand'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

interface OnboardingStatus {
  isComplete: boolean
  completedSteps: number
  totalSteps: number
  steps: Array<{
    id: string
    title: string
    description: string
    completed: boolean
    actionUrl: string
    actionLabel: string
    iconName: string
  }>
}

interface NavBarBaseProps {
  profilePic: string | null
  isAuthenticated: boolean
  isMentor: boolean
  onboardingStatus: OnboardingStatus | null
}

type Audience = 'student' | 'mentor'

const publicLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/blog', label: 'College guides' },
  { href: '/for-mentors', label: 'Start mentoring' },
]

const mobileLinks = [...publicLinks, { href: '/about', label: 'About Discuno' }]

function isActiveLink(pathname: string, href: string) {
  if (href.includes('#')) return false
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
}

export function NavBarBase({
  profilePic,
  isAuthenticated,
  isMentor,
  onboardingStatus,
}: NavBarBaseProps) {
  const pathname = usePathname()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginMode, setLoginMode] = useState<'signin' | 'signup'>('signin')
  const [loginAudience, setLoginAudience] = useState<Audience>('student')

  const openLoginModal = (mode: 'signin' | 'signup', audience: Audience) => {
    setLoginMode(mode)
    setLoginAudience(audience)
    setIsLoginModalOpen(true)
  }

  return (
    <>
      <LoginModal
        isOpen={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        mode={loginMode}
        defaultUserType={loginAudience}
      />

      <header className="border-foreground/15 bg-background sticky top-0 z-40 border-b">
        <nav
          className="page-shell flex h-[4.25rem] items-center gap-6"
          aria-label="Main navigation"
        >
          <Brand className="shrink-0" />

          <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
            {publicLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
                className={cn(
                  'hover:text-foreground focus-visible:ring-ring/30 rounded-sm text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none',
                  isActiveLink(pathname, link.href) ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {!isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => openLoginModal('signin', 'student')}
                >
                  Sign in
                </Button>
                <Link
                  href="/find"
                  className={cn(buttonVariants({ size: 'sm' }), 'hidden md:inline-flex')}
                >
                  Find a mentor
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </>
            ) : (
              <>
                {isMentor ? (
                  <Link
                    href="/settings"
                    className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
                  >
                    <LayoutDashboard data-icon="inline-start" />
                    Open workspace
                  </Link>
                ) : (
                  <Link
                    href="/find"
                    className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')}
                  >
                    Find a mentor
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                )}
                <AvatarIcon
                  profilePic={profilePic}
                  isAuthenticated={isAuthenticated}
                  onboardingStatus={onboardingStatus}
                />
              </>
            )}

            <MobileMenu
              isAuthenticated={isAuthenticated}
              isMentor={isMentor}
              onLoginClick={openLoginModal}
            />
          </div>
        </nav>
      </header>
    </>
  )
}

function MobileMenu({
  isAuthenticated,
  isMentor,
  onLoginClick,
}: {
  isAuthenticated: boolean
  isMentor: boolean
  onLoginClick: (mode: 'signin' | 'signup', audience: Audience) => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent className="w-[min(90vw,25rem)]">
        <SheetHeader>
          <SheetTitle>Explore Discuno</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col px-5" aria-label="Mobile navigation">
          {mobileLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
              className={cn(
                'border-foreground/15 focus-visible:ring-ring/30 flex min-h-14 items-center border-b text-lg font-medium transition-colors outline-none focus-visible:ring-3',
                isActiveLink(pathname, link.href)
                  ? 'text-primary'
                  : 'text-foreground hover:text-primary'
              )}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <SheetFooter>
          {!isAuthenticated ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  onLoginClick('signin', 'student')
                  setOpen(false)
                }}
              >
                Sign in
              </Button>
              <Link
                href="/find"
                className={buttonVariants({ size: 'lg' })}
                onClick={() => setOpen(false)}
              >
                Find a mentor
                <ArrowRight data-icon="inline-end" />
              </Link>
            </>
          ) : isMentor ? (
            <Link
              href="/settings"
              className={buttonVariants({ size: 'lg' })}
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard data-icon="inline-start" />
              Open workspace
            </Link>
          ) : (
            <Link
              href="/find"
              className={buttonVariants({ size: 'lg' })}
              onClick={() => setOpen(false)}
            >
              Find a mentor
              <ArrowRight data-icon="inline-end" />
            </Link>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function NavBarSkeleton() {
  return (
    <div className="border-foreground/15 bg-background h-[4.25rem] border-b">
      <div className="page-shell flex h-full items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
