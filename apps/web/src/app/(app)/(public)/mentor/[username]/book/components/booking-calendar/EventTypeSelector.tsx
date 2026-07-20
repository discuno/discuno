import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { cn } from '~/lib/utils'

const formatEventTypePrice = (eventType: EventType) =>
  (eventType.price ?? 0) > 0
    ? formatCurrencyFromCents(eventType.price ?? 0, eventType.currency ?? 'USD')
    : 'Free'

export const EventTypeSelector = ({
  selectedEventType,
  eventTypes,
  onSelectEventType,
  onSelectTimeSlot,
  className,
}: {
  selectedEventType: EventType | null
  eventTypes: EventType[]
  onSelectEventType: (eventType: EventType | null) => void
  onSelectTimeSlot: (timeSlot: string | null) => void
  className?: string
}) => (
  <Select
    items={eventTypes.map(eventType => ({
      label: eventType.title,
      value: eventType.id.toString(),
    }))}
    value={selectedEventType?.id.toString() ?? null}
    onValueChange={value => {
      const eventType = eventTypes.find(candidate => candidate.id.toString() === value)
      onSelectEventType(eventType ?? null)
      onSelectTimeSlot(null)
    }}
  >
    <SelectTrigger aria-label="Session" className={cn('h-auto min-h-12 w-full py-2.5', className)}>
      {selectedEventType ? (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
          <span className="min-w-0">
            <span className="block truncate font-medium">{selectedEventType.title}</span>
            <span className="text-muted-foreground block text-xs">
              {selectedEventType.length} minutes
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium">
            {formatEventTypePrice(selectedEventType)}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground">Select a session</span>
      )}
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {eventTypes.map(eventType => (
          <SelectItem key={eventType.id} value={eventType.id.toString()} className="py-3">
            <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block truncate">{eventType.title}</span>
                <span className="text-muted-foreground block text-xs font-normal">
                  {eventType.length} minutes
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium">
                {formatEventTypePrice(eventType)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
)
