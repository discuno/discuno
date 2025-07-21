'use client'

import { Edit3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

export interface EventType {
  id: number
  title?: string
  lengthInMinutes?: number
  price?: number
  hidden?: boolean
}

interface EventTypeListClientProps {
  eventTypes: EventType[]
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="animate-pulse">
        <div className="bg-muted mb-4 h-8 w-1/3 rounded"></div>
        <div className="bg-muted mb-8 h-4 w-2/3 rounded"></div>
        <div className="bg-card rounded-lg border p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const EventTypeListClient = ({ eventTypes }: EventTypeListClientProps) => {
  const [editId, setEditId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const router = useRouter()

  // Handle the create→edit flow
  const handleEventTypeCreated = (eventTypeId: number) => {
    // Close create modal and open edit modal for the newly created event type
    setShowCreate(false)
    setEditId(eventTypeId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground">
        <p className="text-sm">
          Event types from Cal.com are no longer directly editable through this interface. Please
          use the Cal.com dashboard to manage your event types.
        </p>
      </div>

      {/* Event Types List */}
      <div className="grid gap-4">
        {eventTypes.map(eventType => (
          <Card key={eventType.id} className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{eventType.title || 'Untitled Event'}</h3>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {eventType.lengthInMinutes || 30} min
                    </Badge>
                    {eventType.price && (
                      <Badge variant="secondary" className="text-xs">
                        ${eventType.price}
                      </Badge>
                    )}
                    {eventType.hidden && (
                      <Badge variant="destructive" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditId(eventType.id)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>Create New Event Type</Button>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-background border-border flex max-h-[95vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader className="border-border flex-shrink-0 border-b pb-4">
            <DialogTitle className="text-foreground text-xl font-semibold">
              Create New Event Type
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 py-4">
            <div className="p-8 text-center">
              <h3 className="mb-4 text-lg font-semibold">Cal.com Integration Required</h3>
              <p className="text-muted-foreground mb-4">
                To create new event types, please use the Cal.com dashboard.
              </p>
              <Button
                onClick={() => {
                  window.open('https://cal.com/event-types', '_blank')
                  setShowCreate(false)
                }}
              >
                Open Cal.com Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="bg-background border-border flex max-h-[95vh] max-w-7xl flex-col overflow-hidden">
          <DialogHeader className="border-border flex-shrink-0 border-b pb-4">
            <DialogTitle className="text-foreground text-xl font-semibold">
              Edit Event Type
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 py-4">
            <div className="p-8 text-center">
              <h3 className="mb-4 text-lg font-semibold">Cal.com Integration Required</h3>
              <p className="text-muted-foreground mb-4">
                To edit event types, please use the Cal.com dashboard.
              </p>
              <Button
                onClick={() => {
                  window.open('https://cal.com/event-types', '_blank')
                  setEditId(null)
                }}
              >
                Open Cal.com Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
