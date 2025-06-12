# @discuno-atoms

Customizable UI components to integrate Cal.com scheduling into your product, built specifically for Next.js applications with improved hydration handling.

## Features

- 🚀 **Next.js 14+ Compatible** - Built for modern Next.js with App Router
- 🎨 **Customizable UI** - Based on Tailwind CSS and Shadcn/ui patterns
- 🔌 **Cal.com API v2** - Full integration with Cal.com's latest API
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎯 **TypeScript First** - Complete type safety
- ⚡ **Zero Hydration Issues** - Designed to prevent SSR/client mismatches
- 🎭 **Themeable** - Supports custom themes and branding

## Installation

```bash
npm install @discuno-atoms
# or
yarn add @discuno-atoms
# or
pnpm add @discuno-atoms
```

## Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your Cal.com credentials:
```bash
# Get these from https://app.cal.com/settings/developer/api-keys
CAL_API_URL=https://api.cal.com/v2
CAL_WEB_APP_URL=https://cal.com
CAL_ACCESS_TOKEN=your_access_token_here
CAL_REFRESH_TOKEN=your_refresh_token_here
```

### Peer Dependencies

Make sure you have these peer dependencies installed:

```bash
npm install react react-dom @tanstack/react-query
```

## Quick Start

### 1. Import CSS

Import the component styles in your app:

```tsx
import '@discuno-atoms/globals.css'
```

### 2. Wrap your app with CalProvider

```tsx
import { CalProvider } from '@discuno-atoms'

function App() {
  return (
    <CalProvider
      config={{
        apiUrl: 'https://api.cal.com/v2',
        accessToken: 'your-access-token',
        webAppUrl: 'https://cal.com'
      }}
    >
      <YourApp />
    </CalProvider>
  )
}
```

### 3. Use components

```tsx
import { Booker } from '@discuno-atoms'

function BookingPage() {
  return (
    <Booker
      eventTypeSlug="30min"
      username="your-username"
      onBookingComplete={(booking) => {
        console.log('Booking created:', booking)
      }}
    />
  )
}
```

## Components

### Booker

The main booking component that handles the complete booking flow.

```tsx
import { Booker } from '@discuno-atoms'

<Booker
  eventTypeId={123}
  // or
  eventTypeSlug="30min"
  username="your-username"

  // Optional props
  layout="desktop" // 'mobile' | 'desktop' | 'mobile_embed'
  onBookingComplete={(booking) => {}}
  onError={(error) => {}}
  className="custom-class"
/>
```

### AvailabilitySettings

Component for managing user availability and schedules.

```tsx
import { AvailabilitySettings } from '@discuno-atoms'

<AvailabilitySettings
  scheduleId={456}
  onSave={(schedule) => {
    console.log('Schedule saved:', schedule)
  }}
/>
```

## API Client

Direct access to the Cal.com API:

```tsx
import { useCalApi } from '@discuno-atoms'

function MyComponent() {
  const { apiClient } = useCalApi()

  const handleCreateEventType = async () => {
    const eventType = await apiClient.createEventType({
      title: 'New Meeting',
      length: 30,
      slug: 'new-meeting'
    })
  }

  return <button onClick={handleCreateEventType}>Create Event Type</button>
}
```

## Configuration

### CalProvider Props

```tsx
interface CalProviderProps {
  config: {
    apiUrl: string            // Cal.com API base URL
    accessToken?: string      // Your Cal.com access token
    refreshToken?: string     // For token refresh
    clientId?: string         // OAuth client ID
    clientSecret?: string     // OAuth client secret
    webAppUrl?: string        // Cal.com web app URL
  }
  onError?: (error: Error) => void
  children: React.ReactNode
}
```

## Styling

The components use CSS custom properties for theming. You can override these in your CSS:

```css
:root {
  --cal-primary: #your-brand-color;
  --cal-background: #ffffff;
  --cal-foreground: #000000;
  /* ... more custom properties */
}
```

## TypeScript

All components are fully typed. Import types as needed:

```tsx
import type { EventType, Booking, Schedule } from '@discuno-atoms'
```

## Error Handling

Components provide error callbacks for handling API errors:

```tsx
<Booker
  eventTypeSlug="meeting"
  onError={(error) => {
    console.error('Booking error:', error)
    // Handle error (show toast, redirect, etc.)
  }}
/>
```

## Authentication

For authenticated requests, provide an access token:

```tsx
<CalProvider
  config={{
    apiUrl: 'https://api.cal.com/v2',
    accessToken: 'cal_live_...'
  }}
>
  {/* Your app */}
</CalProvider>
```

## Server-Side Rendering

Components are designed to work seamlessly with Next.js SSR:

```tsx
// pages/booking.tsx or app/booking/page.tsx
import { Booker } from '@discuno-atoms'

export default function BookingPage() {
  return (
    <div>
      <h1>Book a Meeting</h1>
      <Booker eventTypeSlug="consultation" />
    </div>
  )
}
```

## Migration from @calcom/atoms

This library provides the same API surface as `@calcom/atoms` but with improved hydration handling:

1. Replace `@calcom/atoms` imports with `@discuno-atoms`
2. Update your CSS import to `@discuno-atoms/globals.css`
3. The component APIs remain the same

## Development

To contribute or customize:

```bash
git clone <repository>
cd discuno-atoms
npm install
npm run dev
```

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@discuno.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Docs: [Documentation](https://docs.discuno.com)
