# Mentor Settings & Onboarding

## Overview
This directory contains the mentor settings and onboarding flow for Discuno. The onboarding process guides new mentors through setting up their profile, availability, event types, and payment options.

## Directory Structure

```
settings/
├── actions.ts                    # Server actions for all settings operations
├── layout.tsx                    # Settings layout with sidebar
├── page.tsx                      # Main onboarding dashboard page
├── components/
│   ├── OnboardingDashboard.tsx   # Main onboarding UI with step tracking
│   ├── QuickSetupDialog.tsx      # Quick setup wizard dialog
│   ├── OnboardingInfoBanner.tsx  # Reusable contextual help banner
│   └── SettingsHeader.tsx        # Settings page header
├── availability/                 # Availability settings
├── billing/                      # Billing and Stripe dashboard
├── bookings/                     # Bookings management
├── event-types/                  # Event type configuration
└── profile/                      # Profile editing
```

## Onboarding Flow

### Step 1: Complete Profile
**Location:** `/settings/profile/edit`
**Required:** Yes
**Estimated Time:** 3 minutes

Mentors must provide:
- Profile photo
- Biography
- Academic information (major, school, year)

**Key Component:** `EditProfileContent.tsx`

### Step 2: Set Availability
**Location:** `/settings/availability`
**Required:** Yes
**Estimated Time:** 5 minutes

Configure when students can book sessions:
- Weekly recurring schedule
- Date-specific overrides (holidays, vacations)

**Key Component:** `AvailabilityManager.tsx`

### Step 3: Enable Event Types
**Location:** `/settings/event-types`
**Required:** Yes
**Estimated Time:** 2 minutes

Choose which session types to offer:
- 15-minute sessions
- 30-minute sessions
- 60-minute sessions

**Key Component:** `EventTypeSettingsContent.tsx`

### Step 4: Set Pricing
**Location:** `/settings/event-types`
**Required:** Yes
**Estimated Time:** 2 minutes

Configure pricing for each enabled event type:
- Free sessions ($0)
- Paid sessions (minimum $5.00)

**Note:** At least one event type must have pricing set (can be $0)

### Step 5: Connect Stripe
**Location:** `/settings/event-types`
**Required:** Only if offering paid sessions
**Estimated Time:** 5 minutes

Set up payment processing:
- Create Stripe Connect account
- Complete verification
- Enable charges and payouts

**Key Component:** `StripeOnboardingModal.tsx`

## Key Features

### Detailed Progress Tracking
The `OnboardingDashboard` shows:
- Overall progress (X of Y steps completed)
- Visual progress bar
- Per-step status with completion badges
- Missing items for incomplete steps
- Estimated time for each step

### Contextual Help
Each page includes:
- Dismissible info banner with page-specific tips
- Inline tooltips on complex features
- Collapsible FAQ section on main dashboard
- Links to support resources

### Smart Requirements
- Stripe is marked as optional for mentors offering only free sessions
- Steps can be completed in any order
- Progress is saved automatically
- Profile remains hidden until all required steps are complete

### Quick Setup Option
A wizard dialog that can configure:
- Free-only session pricing
- Default availability (Mon-Fri, 9 AM - 5 PM)
- All event types enabled

*Note: Quick Setup UI is implemented but backend automation is pending.*

## Server Actions

### Main Actions (`actions.ts`)

#### `getMentorOnboardingStatus()`
Returns the current onboarding status with:
- `isComplete`: boolean indicating if all required steps are done
- `completedSteps`: number of completed steps
- `totalSteps`: total number of required steps
- `steps`: array of step objects with detailed status

**Step Object Structure:**
```typescript
{
  id: string                // Unique step identifier
  title: string             // Step title
  description: string       // Step description
  completed: boolean        // Completion status
  actionUrl: string         // URL to complete the step
  actionLabel: string       // Button text
  iconName: string          // Icon to display
  missingItems?: string[]   // What's needed to complete
  estimatedTime?: string    // Time estimate (e.g., "3 min")
  optional?: boolean        // Whether step is optional
}
```

#### Other Key Actions
- `getSchedule()`: Fetch availability from Cal.com
- `updateSchedule()`: Update availability
- `getMentorEventTypePreferences()`: Get event type settings
- `updateMentorEventTypePreferences()`: Update event type settings
- `createStripeConnectAccount()`: Initialize Stripe onboarding
- `getMentorStripeStatus()`: Check Stripe account status

## Styling Conventions

### Color Scheme
- **Blue**: Welcome messages, info banners, neutral states
- **Green**: Success states, completed steps
- **Amber**: Missing items warnings, incomplete feedback
- **Yellow**: Stripe verification needed
- **Red**: Errors only (not used for incomplete states)

### Icons
Consistent icon usage throughout:
- User → Profile
- CalendarDays → Availability
- BookOpen → Event Types
- DollarSign → Pricing
- CreditCard → Stripe
- CheckCircle2 → Completed
- Circle → Incomplete
- AlertCircle → Warning/Missing
- Info → Help/Information

### Responsive Design
- Mobile-first approach
- Stacks vertically on small screens
- Two/three-column layouts on larger screens
- Touch-friendly targets (minimum 44x44px)

## Accessibility

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order
- Dialog can be closed with Escape
- Collapsible sections toggle with Enter/Space

### Screen Readers
- Proper ARIA labels and roles
- Alert regions for important messages
- Icon alternatives via aria-label
- Semantic HTML structure

### Visual
- WCAG AA color contrast standards
- Focus indicators on all interactive elements
- No reliance on color alone for information
- Respects prefers-reduced-motion

## Development Guidelines

### Adding a New Onboarding Step

1. **Update `getMentorOnboardingStatus()` in `actions.ts`:**
   ```typescript
   const steps = [
     // ... existing steps
     {
       id: 'new-step',
       title: 'New Step Title',
       description: 'What this step is for',
       completed: checkIfComplete,
       actionUrl: '/settings/new-step',
       actionLabel: 'Complete New Step',
       iconName: 'IconName',
       missingItems: generateMissingItems(),
       estimatedTime: '5 min',
       optional: false,
     },
   ]
   ```

2. **Create the step page:**
   - Add directory under `settings/`
   - Implement page component
   - Add `OnboardingInfoBanner` with relevant tips

3. **Update tests:**
   - Add tests for new step logic
   - Update onboarding completion tests

### Modifying Help Content

To update help content in banners or FAQ:
1. Edit the relevant component (`OnboardingDashboard.tsx` or `OnboardingInfoBanner.tsx`)
2. Keep tips concise and actionable
3. Use bullet points for scannability
4. Link to detailed docs when appropriate

### Customizing Colors/Icons

Update the icon map in `OnboardingDashboard.tsx`:
```typescript
const iconMap = {
  User,
  CalendarDays,
  CreditCard,
  BookOpen,
  DollarSign,
  // Add new icons here
} as const
```

## Testing

### Manual Testing Checklist
- [ ] Complete full onboarding flow as new mentor
- [ ] Test free-only path (skip Stripe)
- [ ] Test paid-only path (requires Stripe)
- [ ] Test mixed free/paid path
- [ ] Verify banner dismissal persists
- [ ] Test Quick Setup dialog interactions
- [ ] Test all tooltip hovers
- [ ] Verify responsive layouts on mobile
- [ ] Test keyboard navigation
- [ ] Verify screen reader announcements

### Automated Tests
- Unit tests for `getMentorOnboardingStatus` logic
- Component tests for state transitions
- E2E tests for complete flow
- Accessibility audit with axe-core

## Support Resources

### Documentation
- Main improvements doc: `/docs/mentor-onboarding-improvements.md`
- UI states reference: `/docs/onboarding-ui-states.md`
- Mentor dashboard rules: `.cursor/rules/mentor-dashboard.md`

### Related Files
- Database schema: `apps/web/src/server/db/schema.ts`
- User queries: `apps/web/src/server/queries/profiles.ts`
- Cal.com integration: `apps/web/src/lib/calcom/`
- Stripe integration: `apps/web/src/lib/stripe/`

## Troubleshooting

### Common Issues

**Issue:** Step shows incomplete even though requirements are met
- Check server action logic in `getMentorOnboardingStatus()`
- Verify database records are properly saved
- Check for caching issues (clear and re-fetch)

**Issue:** Banner won't dismiss
- Check localStorage in browser dev tools
- Verify `storageKey` prop is unique
- Clear localStorage for testing: `localStorage.clear()`

**Issue:** Quick Setup doesn't work
- Quick Setup is currently UI-only (shows info toast)
- Backend implementation needs to be added
- See TODO comments in `QuickSetupDialog.tsx`

**Issue:** Stripe step shows as required when offering free sessions
- Verify at least one event type has `customPrice` set to 0
- Check `hasFreeEventTypes` logic in actions
- Ensure event types are enabled

## Future Improvements

See `/docs/mentor-onboarding-improvements.md` for:
- Short-term enhancements
- Medium-term features
- Long-term roadmap
- Metrics to track

## Questions?

For questions about this code:
- Check the comprehensive docs in `/docs/`
- Review the CLAUDE.md file for AI context
- Contact the team at support@discuno.com
