# @discuno-atoms Examples

This document provides comprehensive examples of how to use the @discuno-atoms components in your Next.js application. This package is a fork of [Cal.com](https://cal.com) @calcom/atoms.

## Basic Setup

### 1. Provider Setup

First, wrap your application with the CalProvider:

```tsx
// app/layout.tsx
import { CalProvider } from '@discuno-atoms'
import '@discuno-atoms/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CalProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_CAL_API_URL || 'https://api.cal.com/v2',
            accessToken: process.env.NEXT_PUBLIC_CAL_ACCESS_TOKEN,
            webAppUrl: 'https://cal.com'
          }}
          onError={(error) => {
            console.error('Cal.com API Error:', error)
            // Handle global errors (show toast, etc.)
          }}
        >
          {children}
        </CalProvider>
      </body>
    </html>
  )
}
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_CAL_API_URL=https://api.cal.com/v2
NEXT_PUBLIC_CAL_ACCESS_TOKEN=cal_live_your_access_token_here
```

## Component Examples

### Booker Component

#### Basic Booking Flow

```tsx
// app/book/[slug]/page.tsx
import { Booker } from '@discuno-atoms'

interface BookingPageProps {
  params: { slug: string }
}

export default function BookingPage({ params }: BookingPageProps) {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Book a Meeting</h1>

      <Booker
        eventTypeSlug={params.slug}
        username="your-username"
        onBookingComplete={(booking) => {
          console.log('Booking created:', booking)
          // Redirect to confirmation page or show success message
          window.location.href = `/booking-confirmed/${booking.uid}`
        }}
        onError={(error) => {
          console.error('Booking error:', error)
          // Show error message to user
        }}
        className="max-w-4xl mx-auto"
      />
    </div>
  )
}
```

#### Team Event Booking

```tsx
// app/team/[team]/[eventType]/page.tsx
import { Booker } from '@discuno-atoms'

interface TeamBookingPageProps {
  params: { team: string; eventType: string }
}

export default function TeamBookingPage({ params }: TeamBookingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Booker
          eventTypeSlug={params.eventType}
          username={params.team}
          isTeamEvent={true}
          layout="desktop"
          onBookingComplete={(booking) => {
            // Handle team booking completion
            console.log('Team booking created:', booking)
          }}
        />
      </div>
    </div>
  )
}
```

#### Mobile Embedded Booking

```tsx
// components/MobileBookingWidget.tsx
import { Booker } from '@discuno-atoms'

interface MobileBookingWidgetProps {
  eventTypeId: number
}

export function MobileBookingWidget({ eventTypeId }: MobileBookingWidgetProps) {
  return (
    <div className="w-full h-screen">
      <Booker
        eventTypeId={eventTypeId}
        layout="mobile_embed"
        onBookingComplete={(booking) => {
          // Mobile-specific handling
          const message = `Booking confirmed! Check your email for details.`
          if (navigator.share) {
            navigator.share({
              title: 'Meeting Booked',
              text: message,
            })
          } else {
            alert(message)
          }
        }}
      />
    </div>
  )
}
```

### Availability Settings

#### User Availability Management

```tsx
// app/settings/availability/page.tsx
import { AvailabilitySettings } from '@discuno-atoms'
import { useRouter } from 'next/navigation'

export default function AvailabilityPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Your Availability</h1>

      <AvailabilitySettings
        onSave={(schedule) => {
          console.log('Schedule saved:', schedule)
          // Show success message
          alert('Availability updated successfully!')
        }}
        onError={(error) => {
          console.error('Save error:', error)
          alert('Failed to save availability. Please try again.')
        }}
        className="max-w-4xl"
      />
    </div>
  )
}
```

#### Edit Specific Schedule

```tsx
// app/settings/schedules/[id]/page.tsx
import { AvailabilitySettings } from '@discuno-atoms'

interface EditSchedulePageProps {
  params: { id: string }
}

export default function EditSchedulePage({ params }: EditSchedulePageProps) {
  const scheduleId = parseInt(params.id)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Schedule</h1>

      <AvailabilitySettings
        scheduleId={scheduleId}
        onSave={(schedule) => {
          console.log('Schedule updated:', schedule)
          // Redirect back to schedules list
          window.location.href = '/settings/schedules'
        }}
      />
    </div>
  )
}
```

### Event Type Management

#### Create New Event Type

```tsx
// app/event-types/new/page.tsx
import { EventTypeSettings } from '@discuno-atoms'
import { useRouter } from 'next/navigation'

export default function NewEventTypePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Event Type</h1>

      <EventTypeSettings
        onSave={(eventType) => {
          console.log('Event type created:', eventType)
          // Redirect to event types list
          router.push('/event-types')
        }}
        onError={(error) => {
          console.error('Creation error:', error)
          alert('Failed to create event type. Please try again.')
        }}
      />
    </div>
  )
}
```

#### Edit Existing Event Type

```tsx
// app/event-types/[id]/edit/page.tsx
import { EventTypeSettings } from '@discuno-atoms'

interface EditEventTypePageProps {
  params: { id: string }
}

export default function EditEventTypePage({ params }: EditEventTypePageProps) {
  const eventTypeId = parseInt(params.id)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Event Type</h1>

      <EventTypeSettings
        eventTypeId={eventTypeId}
        onSave={(eventType) => {
          console.log('Event type updated:', eventType)
          // Show success message or redirect
          alert('Event type updated successfully!')
        }}
      />
    </div>
  )
}
```

### OAuth Integrations

#### Calendar Integration Setup

```tsx
// app/settings/integrations/page.tsx
import {
  GoogleCalendarConnect,
  OutlookCalendarConnect,
  ZoomConnect
} from '@discuno-atoms'

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Connect Your Apps</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Google Calendar */}
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Google Calendar</h3>
          <p className="text-gray-600 mb-4">
            Sync your events with Google Calendar
          </p>
          <GoogleCalendarConnect
            onSuccess={(credential) => {
              console.log('Google Calendar connected:', credential)
              alert('Google Calendar connected successfully!')
            }}
            onError={(error) => {
              console.error('Google Calendar connection error:', error)
              alert('Failed to connect Google Calendar')
            }}
          />
        </div>

        {/* Outlook Calendar */}
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Outlook Calendar</h3>
          <p className="text-gray-600 mb-4">
            Sync your events with Outlook Calendar
          </p>
          <OutlookCalendarConnect
            onSuccess={(credential) => {
              console.log('Outlook connected:', credential)
              alert('Outlook Calendar connected successfully!')
            }}
            onError={(error) => {
              console.error('Outlook connection error:', error)
              alert('Failed to connect Outlook Calendar')
            }}
          />
        </div>

        {/* Zoom */}
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Zoom</h3>
          <p className="text-gray-600 mb-4">
            Create Zoom meetings automatically
          </p>
          <ZoomConnect
            onSuccess={(credential) => {
              console.log('Zoom connected:', credential)
              alert('Zoom connected successfully!')
            }}
            onError={(error) => {
              console.error('Zoom connection error:', error)
              alert('Failed to connect Zoom')
            }}
          />
        </div>
      </div>
    </div>
  )
}
```

#### Custom OAuth Flow

```tsx
// components/CustomIntegration.tsx
import { OAuthConnect } from '@discuno-atoms'

export function CustomSlackIntegration() {
  return (
    <OAuthConnect
      appSlug="slack"
      redirectUri={`${window.location.origin}/integrations/slack/callback`}
      onSuccess={(credential) => {
        // Handle successful Slack connection
        console.log('Slack connected:', credential)

        // You could make additional API calls here
        // to set up webhooks, configure settings, etc.
      }}
      onError={(error) => {
        console.error('Slack connection failed:', error)
      }}
    >
      <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
        <img src="/slack-icon.png" alt="Slack" className="w-6 h-6" />
        <span>Connect Slack</span>
      </div>
    </OAuthConnect>
  )
}
```

### Direct API Usage

#### Using the API Client Directly

```tsx
// hooks/useEventTypes.ts
import { useCalApi } from '@discuno-atoms'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useEventTypes() {
  const { apiClient } = useCalApi()
  const queryClient = useQueryClient()

  const {
    data: eventTypes,
    isLoading,
    error
  } = useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => apiClient.getEventTypes(),
  })

  const createEventTypeMutation = useMutation({
    mutationFn: (eventTypeData: any) => apiClient.createEventType(eventTypeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] })
    },
  })

  const deleteEventTypeMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteEventType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTypes'] })
    },
  })

  return {
    eventTypes,
    isLoading,
    error,
    createEventType: createEventTypeMutation.mutate,
    deleteEventType: deleteEventTypeMutation.mutate,
    isCreating: createEventTypeMutation.isPending,
    isDeleting: deleteEventTypeMutation.isPending,
  }
}
```

#### Custom Booking Flow

```tsx
// components/CustomBookingFlow.tsx
import { useState } from 'react'
import { useCalApi } from '@discuno-atoms'
import { useMutation } from '@tanstack/react-query'

export function CustomBookingFlow({ eventTypeId }: { eventTypeId: number }) {
  const { apiClient } = useCalApi()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    notes: ''
  })

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error('No time slot selected')

      return apiClient.createBooking({
        eventTypeId,
        start: selectedSlot,
        end: new Date(new Date(selectedSlot).getTime() + 30 * 60 * 1000).toISOString(),
        responses: bookingData,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en'
      })
    },
    onSuccess: (booking) => {
      console.log('Booking created:', booking)
      alert('Booking confirmed!')
    }
  })

  return (
    <div className="space-y-6">
      {/* Custom time slot selection */}
      <div>
        <h3 className="font-semibold mb-2">Select a time</h3>
        {/* Your custom time slot UI */}
      </div>

      {/* Custom form */}
      <div>
        <h3 className="font-semibold mb-2">Your details</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={bookingData.name}
            onChange={(e) => setBookingData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Your email"
            value={bookingData.email}
            onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Additional notes"
            value={bookingData.notes}
            onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <button
        onClick={() => createBookingMutation.mutate()}
        disabled={!selectedSlot || createBookingMutation.isPending}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {createBookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
      </button>
    </div>
  )
}
```

## Error Handling

### Global Error Handling

```tsx
// app/layout.tsx
import { CalProvider } from '@discuno-atoms'
import { toast } from 'sonner' // or your preferred toast library

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CalProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_CAL_API_URL!,
            accessToken: process.env.NEXT_PUBLIC_CAL_ACCESS_TOKEN,
          }}
          onError={(error) => {
            console.error('Cal.com Error:', error)

            // Handle specific error types
            if (error.message.includes('401')) {
              toast.error('Authentication failed. Please check your access token.')
            } else if (error.message.includes('403')) {
              toast.error('Permission denied. Please check your API permissions.')
            } else if (error.message.includes('429')) {
              toast.error('Rate limit exceeded. Please try again later.')
            } else {
              toast.error('An error occurred. Please try again.')
            }
          }}
        >
          {children}
        </CalProvider>
      </body>
    </html>
  )
}
```

### Component-Level Error Handling

```tsx
// components/BookingWithErrorHandling.tsx
import { Booker } from '@discuno-atoms'
import { useState } from 'react'

export function BookingWithErrorHandling() {
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Booker
        eventTypeSlug="30min"
        onError={(err) => {
          setError(err.message)

          // Send error to monitoring service
          console.error('Booking error:', err)
          // analytics.track('booking_error', { error: err.message })
        }}
        onBookingComplete={(booking) => {
          setError(null)
          console.log('Booking successful:', booking)
          // analytics.track('booking_completed', { bookingId: booking.id })
        }}
      />
    </div>
  )
}
```

## Styling and Customization

### Custom CSS

```css
/* styles/cal-atoms-custom.css */

/* Override default styles */
.cal-booker {
  --cal-border-radius: 8px;
  --cal-primary-color: #6366f1;
  --cal-background-color: #ffffff;
}

.cal-booker .step-datetime {
  background: var(--cal-background-color);
  border-radius: var(--cal-border-radius);
}

.cal-booker .time-slots button {
  border-radius: var(--cal-border-radius);
  transition: all 0.2s ease;
}

.cal-booker .time-slots button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

### Tailwind Integration

```tsx
// components/StyledBooker.tsx
import { Booker } from '@discuno-atoms'

export function StyledBooker() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-xl">
      <Booker
        eventTypeSlug="consultation"
        className="bg-white rounded-lg shadow-xl"
        onBookingComplete={(booking) => {
          console.log('Booking created:', booking)
        }}
      />
    </div>
  )
}
```

This comprehensive example guide should help users understand how to implement and customize the @discuno-atoms components in their applications.
