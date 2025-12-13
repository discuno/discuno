'use client'

import { BookOpen, LayoutDashboard, LogOut, Menu, Search, User, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LoginModal } from '~/components/auth/LoginModal'
import { ThemeAwareIconLogo } from '~/components/shared/ThemeAwareIconLogo'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Badge } from '~/components/ui/badge'
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

export function NavBarBase({
  profilePic,
  isAuthenticated,
  isMentor,
  onboardingStatus,
}: NavBarBaseProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginMode, setLoginMode] = useState<'signin' | 'signup'>('signin')

  const openLoginModal = (mode: 'signin' | 'signup') => {
    setLoginMode(mode)
    setIsLoginModalOpen(true)
  }

  // Detect scroll for subtle styling changes
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} mode={loginMode} />

      {/*
        Floating "Pill" Navbar
        Centered, detached from edges, high z-index.
      */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav
          className={cn(
            'pointer-events-auto flex items-center justify-between gap-2 p-1.5 transition-all duration-500 ease-out',
            'border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 shadow-lg backdrop-blur-xl',
            'w-full max-w-4xl rounded-full', // Pill shape
            isScrolled ? 'border-border/60 shadow-xl' : 'border-border/20'
          )}
        >
          {/* Logo Section */}
          <Link
            href="/"
            className="group bg-background/50 hover:bg-accent flex aspect-square h-10 w-10 items-center justify-center rounded-full transition-colors"
          >
            <ThemeAwareIconLogo />
            <span className="sr-only">Home</span>
          </Link>

          {/* Desktop Links - Managed as a clean row */}
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/" icon={<Search className="h-4 w-4" />} label="Find Mentors" />
            <div className="bg-border/50 mx-1 h-4 w-px" />
            <NavLink
              href="/resources"
              icon={<BookOpen className="h-4 w-4" />}
              label="Resources"
              disabled
              badge="Soon"
            />
          </div>

          {/* Mobile Spacer / Center replacement */}
          <div className="flex flex-1 md:hidden" />

          {/* Right Action Section */}
          <div className="flex items-center gap-2 pl-2">
            {!isAuthenticated ? (
              <>
                <div className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground rounded-full px-4"
                    onClick={() => openLoginModal('signin')}
                  >
                    Sign In
                  </Button>
                </div>
                <div onClick={() => openLoginModal('signup')}>
                  <Button size="sm" className="rounded-full px-5 font-medium shadow-sm">
                    Get Started
                  </Button>
                </div>
              </>
            ) : (
              <>
                {isMentor && (
                  <Link href="/settings" className="hidden sm:block">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground h-9 w-9 rounded-full"
                      title="Dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <AvatarIcon
                  profilePic={profilePic}
                  isAuthenticated={isAuthenticated}
                  onboardingStatus={onboardingStatus}
                />
              </>
            )}

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <MobileMenu
                isAuthenticated={isAuthenticated}
                isMentor={isMentor}
                onLoginClick={openLoginModal}
              />
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}

function NavLink({
  href,
  icon,
  label,
  disabled,
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
  badge?: string
}) {
  if (disabled) {
    return (
      <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors">
        {icon}
        <span>{label}</span>
        {badge && (
          <Badge
            variant="outline"
            className="border-muted-foreground/20 text-muted-foreground/50 ml-0.5 h-4 px-1 text-[9px]"
          >
            {badge}
          </Badge>
        )}
      </div>
    )
  }
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

// Simplified Mobile Menu
function MobileMenu({
  isAuthenticated,
  isMentor,
  onLoginClick,
}: {
  isAuthenticated: boolean
  isMentor: boolean
  onLoginClick: (mode: 'signin' | 'signup') => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Menu">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl p-2">
        <DropdownMenuItem asChild>
          <Link href="/" className="flex w-full items-center gap-2 rounded-lg p-2 font-medium">
            <Search className="h-4 w-4" />
            Find Mentors
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="flex w-full items-center gap-2 rounded-lg p-2 font-medium opacity-50"
        >
          <BookOpen className="h-4 w-4" />
          Resources
          <Badge variant="outline" className="ml-auto h-5">
            Soon
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {isAuthenticated ? (
          <>
            {isMentor && (
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex w-full items-center gap-2 rounded-lg p-2 font-medium"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Mentor Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-2 rounded-lg p-2 font-medium"
              >
                <User className="h-4 w-4" />
                My Account
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 font-medium"
              onClick={() => {
                onLoginClick('signup')
                setOpen(false)
              }}
            >
              <User className="h-4 w-4" />
              Get Started
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 font-medium"
              onClick={() => {
                onLoginClick('signin')
                setOpen(false)
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign In
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Minimal Skeleton for the Pill
export function NavBarSkeleton() {
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="border-border/20 bg-background/80 h-14 w-full max-w-4xl rounded-full border shadow-lg backdrop-blur-xl" />
    </div>
  )
}
