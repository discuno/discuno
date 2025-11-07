import * as SelectPrimitive from '@radix-ui/react-select'
import { Check } from 'lucide-react'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Badge } from '~/components/ui/badge'
import { Select, SelectContent, SelectTrigger, SelectValue } from '~/components/ui/select'
import { cn } from '~/lib/utils'

const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'focus:bg-primary/10 focus:text-primary relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    {children}
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export const EventTypeSelector = ({
  selectedEventType,
  eventTypes,
  onSelectEventType,
  onSelectTimeSlot,
  className = '',
}: {
  selectedEventType: EventType | null
  eventTypes: EventType[]
  onSelectEventType: (eventType: EventType | null) => void
  onSelectTimeSlot: (timeSlot: string | null) => void
  className?: string
}) => (
  <Select
    value={selectedEventType?.id.toString() ?? ''}
    onValueChange={value => {
      const eventType = eventTypes.find(et => et.id.toString() === value)
      onSelectEventType(eventType ?? null)
      onSelectTimeSlot(null)
    }}
  >
    <SelectTrigger className={cn('w-full', className)}>
      <div className="flex w-full items-center justify-between">
        {selectedEventType ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedEventType.title}</span>
            <span className="text-muted-foreground text-xs">
              {selectedEventType.length} minutes
            </span>
          </div>
        ) : (
          <SelectValue
            placeholder={className.includes('h-10') ? 'Session Type' : 'Select a session type'}
          />
        )}

        <div className="pr-2">
          {selectedEventType?.price && selectedEventType.price > 0 ? (
            <Badge variant="secondary" className="badge-success-muted">
              ${(selectedEventType.price / 100).toFixed(2)} {selectedEventType.currency}
            </Badge>
          ) : (
            <Badge variant="outline">{selectedEventType ? 'Free' : ''}</Badge>
          )}
        </div>
      </div>
    </SelectTrigger>
    <SelectContent>
      {eventTypes.map(eventType => (
        <SelectItem key={eventType.id} value={eventType.id.toString()}>
          <div className="flex w-full items-center">
            <div className="flex flex-col items-start">
              <span className="font-medium">{eventType.title}</span>
              <span className="text-muted-foreground text-xs">{eventType.length} minutes</span>
            </div>
            <div className="flex-grow" />
            {eventType.price && eventType.price > 0 ? (
              <Badge variant="secondary" className="badge-success-muted">
                ${(eventType.price / 100).toFixed(2)} {eventType.currency}
              </Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)
