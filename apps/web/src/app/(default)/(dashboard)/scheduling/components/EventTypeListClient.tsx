'use client'

import { Edit3 } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { CreateEventTypeComponent, EventTypeSettingsComponent } from './EventTypeComponents'

interface EventType {
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

  // Debug log to see the actual data structure
  console.log('Event types data:', eventTypes)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Event Types</h1>
          <p className="text-muted-foreground mt-2">
            Manage your availability, event types, and booking preferences
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          + New
        </Button>
      </div>

      <div className="space-y-3">
        {eventTypes.length > 0 ? (
          eventTypes.map(et => {
            // Use duration or length, whichever exists
            const lengthInMinutes = et.lengthInMinutes ?? 0
            // Use name or title, whichever exists
            const name = et.title ?? 'Unknown Event'
            // Get first letter safely
            const firstLetter =
              name && typeof name === 'string' ? name.charAt(0).toUpperCase() : 'E'
            // Check if event type is paid
            const isPaid = (et.price ?? 0) < 0

            console.log(`Event type ${name}:`, {
              lengthInMinutes: et.lengthInMinutes,
              title: et.title,
              price: et.price,
              isPaid,
              full: et,
            })

            return (
              <Card
                key={et.id}
                className="border-border bg-card hover:bg-accent/5 border transition-colors"
              >
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                      <span className="text-muted-foreground text-sm font-medium">
                        {firstLetter}
                      </span>
                    </div>
                    <div>
                      <span className="text-card-foreground font-semibold">{name}</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {lengthInMinutes} mins
                        </Badge>
                        {isPaid && (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-xs hover:bg-green-700"
                          >
                            Paid
                          </Badge>
                        )}
                        {et.hidden && (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditId(et.id)}
                    className="hover:bg-accent h-8 w-8"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card className="border-border bg-card border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted mb-4 rounded-full p-3">
                <Edit3 className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="text-card-foreground mb-2 font-semibold">No event types yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Create your first event type to start accepting bookings
              </p>
              <Button onClick={() => setShowCreate(true)}>Create Event Type</Button>
            </CardContent>
          </Card>
        )}
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
            <Suspense fallback={<LoadingSkeleton />}>
              <CreateEventTypeComponent />
            </Suspense>
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
            {editId && (
              <Suspense fallback={<LoadingSkeleton />}>
                <EventTypeSettingsComponent key={editId} eventTypeId={editId} />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
