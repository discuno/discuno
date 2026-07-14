'use client'

import { BookOpen, LayoutDashboard, LogIn, Menu, Search, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LoginModal } from '~/components/auth/LoginModal'
import { Brand } from '~/components/shared/Brand'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
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
  { href: '/#mentors', label: 'Find mentors' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/for-mentors', label: 'For mentors' },
  { href: '/blog', label: 'Resources' },
]

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

      <header className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/88 sticky top-0 z-50 border-b backdrop-blur-md">
        <nav
          className="page-container flex h-[68px] items-center justify-between gap-6"
          aria-label="Main navigation"
        >
          <Brand />

          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {publicLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === link.href && 'bg-muted text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

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
                  Become a mentor
                </Button>
              </>
            ) : (
              <>
                {isMentor && (
                  <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                    <Link href="/settings">
                      <LayoutDashboard />
                      Dashboard
                    </Link>
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
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild className="lg:hidden">
        <Button size="icon" variant="ghost" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X /> : <Menu />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-xl p-2">
        <DropdownMenuItem asChild>
          <Link href="/#mentors" className="gap-3 py-2.5" onClick={() => setOpen(false)}>
            <Search />
            Find mentors
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/#how-it-works" className="gap-3 py-2.5" onClick={() => setOpen(false)}>
            <BookOpen />
            How it works
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/for-mentors" className="gap-3 py-2.5" onClick={() => setOpen(false)}>
            <UserRound />
            For mentors
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/blog" className="gap-3 py-2.5" onClick={() => setOpen(false)}>
            <BookOpen />
            Resources
          </Link>
        </DropdownMenuItem>

        {!isAuthenticated && <DropdownMenuSeparator />}

        {!isAuthenticated ? (
          <>
            <DropdownMenuItem
              className="gap-3 py-2.5"
              onSelect={() => {
                onLoginClick('signin', 'student')
                setOpen(false)
              }}
            >
              <LogIn />
              Sign in
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-primary gap-3 py-2.5 font-semibold"
              onSelect={() => {
                onLoginClick('signup', 'mentor')
                setOpen(false)
              }}
            >
              <UserRound />
              Become a mentor
            </DropdownMenuItem>
          </>
        ) : (
          isMentor && (
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-3 py-2.5" onClick={() => setOpen(false)}>
                <LayoutDashboard />
                Mentor dashboard
              </Link>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NavBarSkeleton() {
  return (
    <div className="border-border/80 bg-background h-[68px] border-b">
      <div className="page-container flex h-full items-center justify-between">
        <div className="bg-muted h-8 w-32 animate-pulse rounded-lg" />
        <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
      </div>
    </div>
  )
}
