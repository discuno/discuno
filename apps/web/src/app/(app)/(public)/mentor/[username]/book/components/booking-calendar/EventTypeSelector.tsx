import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

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
    <SelectTrigger className={className}>
      <SelectValue
        placeholder={className.includes('h-10') ? 'Session Type' : 'Select a session type'}
      />
    </SelectTrigger>
    <SelectContent>
      {eventTypes.map(eventType => (
        <SelectItem key={eventType.id} value={eventType.id.toString()}>
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start">
              <span className="font-medium">{eventType.title}</span>
              <span className="text-muted-foreground text-xs">{eventType.length} minutes</span>
            </div>
            {eventType.price && eventType.price > 0 ? (
              <Badge variant="secondary">
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
