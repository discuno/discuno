'use client'

import { ArrowRight, LayoutDashboard, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LoginModal } from '~/components/auth/LoginModal'
import { Brand } from '~/components/shared/Brand'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Button } from '~/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '~/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
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
  { href: '/#mentors', label: 'Find a mentor' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/blog', label: 'College guides' },
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

      <header className="border-foreground/15 bg-background sticky top-0 z-50 border-b">
        <nav
          className="page-container flex h-16 items-center justify-between gap-5"
          aria-label="Main navigation"
        >
          <Brand />

          <NavigationMenu className="hidden flex-1 lg:flex">
            <NavigationMenuList>
              {publicLinks.map(link => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink
                    active={isActiveLink(pathname, link.href)}
                    render={<Link href={link.href} />}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      'text-muted-foreground after:bg-highlight data-[active=true]:text-foreground relative after:absolute after:inset-x-3 after:bottom-0 after:h-1 after:origin-left after:scale-x-0 after:transition-transform data-[active=true]:bg-transparent data-[active=true]:after:scale-x-100'
                    )}
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-1.5 sm:gap-2">
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
                <Button
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={() => openLoginModal('signup', 'mentor')}
                >
                  Share your experience
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                {isMentor ? (
                  <Button
                    render={<Link href="/settings" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    <LayoutDashboard data-icon="inline-start" />
                    Dashboard
                  </Button>
                ) : (
                  <Button
                    render={<Link href="/for-mentors" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                  >
                    Become a mentor
                  </Button>
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
            size="icon"
            variant="ghost"
            className="lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent className="w-[min(88vw,24rem)]">
        <SheetHeader className="border-border/70 border-b pr-16">
          <SheetTitle>Where can we help?</SheetTitle>
          <SheetDescription>
            Find someone who has faced the college decision in front of you.
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 p-3" aria-label="Mobile navigation">
          {mobileLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
              className={cn(
                'hover:bg-muted focus-visible:ring-ring/30 flex min-h-12 items-center rounded-lg border-l-4 border-transparent px-4 text-base font-medium transition-colors outline-none focus-visible:ring-3',
                isActiveLink(pathname, link.href)
                  ? 'bg-accent/45 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <SheetFooter className="border-border/70 border-t">
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
              <Button
                size="lg"
                onClick={() => {
                  onLoginClick('signup', 'mentor')
                  setOpen(false)
                }}
              >
                Share your experience
                <ArrowRight data-icon="inline-end" />
              </Button>
            </>
          ) : isMentor ? (
            <Button
              render={<Link href="/settings" onClick={() => setOpen(false)} />}
              nativeButton={false}
              size="lg"
            >
              <LayoutDashboard data-icon="inline-start" />
              Open mentor dashboard
            </Button>
          ) : (
            <Button
              render={<Link href="/for-mentors" onClick={() => setOpen(false)} />}
              nativeButton={false}
              size="lg"
            >
              Become a mentor
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function NavBarSkeleton() {
  return (
    <div className="border-border/70 bg-background h-16 border-b">
      <div className="page-container flex h-full items-center justify-between">
        <div className="bg-muted h-8 w-32 animate-pulse rounded-lg" />
        <div className="bg-muted h-9 w-28 animate-pulse rounded-full" />
      </div>
    </div>
  )
}
