import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { cn } from '~/lib/utils'

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
    items={[
      { label: 'Select a session type', value: null },
      ...eventTypes.map(eventType => ({
        label: eventType.title,
        value: eventType.id.toString(),
      })),
    ]}
    value={selectedEventType?.id.toString() ?? null}
    onValueChange={value => {
      const eventType = eventTypes.find(et => et.id.toString() === value)
      onSelectEventType(eventType ?? null)
      onSelectTimeSlot(null)
    }}
  >
    <SelectTrigger aria-label="Session type" className={cn('w-full', className)}>
      <div className="flex w-full items-center justify-between">
        {selectedEventType ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedEventType.title}</span>
            <span className="text-muted-foreground text-xs">
              {selectedEventType.length} minutes
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">
            {className.includes('h-10') ? 'Session Type' : 'Select a session type'}
          </span>
        )}

        <div className="pr-2">
          {selectedEventType?.price && selectedEventType.price > 0 ? (
            <Badge variant="secondary" className="badge-success-muted">
              {formatCurrencyFromCents(
                selectedEventType.price,
                selectedEventType.currency ?? 'USD'
              )}
            </Badge>
          ) : (
            <Badge variant="outline">{selectedEventType ? 'Free' : ''}</Badge>
          )}
        </div>
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
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
                  {formatCurrencyFromCents(eventType.price, eventType.currency ?? 'USD')}
                </Badge>
              ) : (
                <Badge variant="outline">Free</Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
)
