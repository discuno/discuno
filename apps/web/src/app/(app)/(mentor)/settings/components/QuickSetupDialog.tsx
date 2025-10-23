'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'

interface QuickSetupDialogProps {
  onSetupComplete: () => void
}

export const QuickSetupDialog = ({ onSetupComplete }: QuickSetupDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [setupOptions, setSetupOptions] = useState({
    freeOnly: true,
    defaultAvailability: true,
    allEventTypes: true,
  })

  const handleQuickSetup = () => {
    // This would be implemented to actually configure the mentor's settings
    // For now, we'll just show what it would do
    toast.info('Quick Setup is a preview feature. Please complete each step manually for now.')
    setIsOpen(false)
    onSetupComplete()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Setup
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Setup Wizard
          </AlertDialogTitle>
          <AlertDialogDescription>
            Get started quickly with recommended default settings. You can customize everything
            later.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="freeOnly"
                checked={setupOptions.freeOnly}
                onCheckedChange={checked =>
                  setSetupOptions(prev => ({ ...prev, freeOnly: checked === true }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="freeOnly" className="font-medium cursor-pointer">
                  Start with free sessions only
                </Label>
                <p className="text-muted-foreground text-xs">
                  Skip Stripe setup and offer free mentorship to build your reputation
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="defaultAvailability"
                checked={setupOptions.defaultAvailability}
                onCheckedChange={checked =>
                  setSetupOptions(prev => ({ ...prev, defaultAvailability: checked === true }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="defaultAvailability" className="font-medium cursor-pointer">
                  Set default availability
                </Label>
                <p className="text-muted-foreground text-xs">
                  Mon-Fri, 9 AM - 5 PM (your local time). You can customize later.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="allEventTypes"
                checked={setupOptions.allEventTypes}
                onCheckedChange={checked =>
                  setSetupOptions(prev => ({ ...prev, allEventTypes: checked === true }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="allEventTypes" className="font-medium cursor-pointer">
                  Enable all event types
                </Label>
                <p className="text-muted-foreground text-xs">
                  15, 30, and 60-minute sessions all set to free
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> You&apos;ll still need to complete your profile (bio and
              photo) manually to activate your account.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleQuickSetup}>Apply Quick Setup</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
