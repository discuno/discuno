# Mentor Onboarding UI States

## Onboarding Dashboard States

### State 1: Incomplete Profile (Start of Onboarding)
**Components:**
- Blue welcome alert instead of red "inactive" alert
- Progress bar showing 0 of 5 steps complete
- Quick Setup button in header
- Each step card shows:
  - Step number and title
  - Optional/Required badge (if applicable)
  - Estimated time badge
  - Description
  - Missing items in amber alert box (if incomplete)
  - Action button
- Collapsible "Need Help?" section at bottom

**Example Step Card (Incomplete):**
```
┌─────────────────────────────────────────────────────────┐
│ ○  Step 1: Complete your profile                       │
│    [Optional] [3 min]                                   │
│                                                         │
│    Add a bio and profile photo to help students        │
│    get to know you                                      │
│                                                         │
│    ⚠ Missing:                                          │
│    • Biography                                          │
│    • Profile photo                                      │
│                                                         │
│    [Complete Profile]                                   │
└─────────────────────────────────────────────────────────┘
```

### State 2: Partially Complete
**Changes from State 1:**
- Progress bar shows completion (e.g., "2 of 5 completed")
- Completed steps have:
  - Green checkmark icon
  - Green border and background
  - "Completed" badge
  - No action button
  - No missing items alert

**Example Step Card (Complete):**
```
┌─────────────────────────────────────────────────────────┐
│ ✓  Step 1: Complete your profile        [Completed]    │
│                                                         │
│    Add a bio and profile photo to help students        │
│    get to know you                                      │
└─────────────────────────────────────────────────────────┘
```

### State 3: Onboarding Complete
**Components:**
- Green celebration alert: "Your profile is active! 🎉"
- Next Steps card with action buttons:
  - View or update your profile
  - Adjust your event types and pricing
  - Fine-tune your availability
  - View your upcoming bookings
  - [Go to Dashboard] (primary button)
- "Pro Tips for Success" card with best practices

## Page-Specific Banners

### Profile Edit Page Banner
```
┌─────────────────────────────────────────────────────────┐
│ ℹ  Complete Your Profile                          [×]  │
│                                                         │
│    Your profile helps students understand who you       │
│    are and what you can help them with. A complete     │
│    profile with a photo and detailed bio helps build   │
│    trust.                                               │
│                                                         │
│    • Add a professional photo - profiles with photos   │
│      get 3x more bookings                              │
│    • Write a detailed bio highlighting your            │
│      experience and what you can help with             │
│    • Your academic information helps students find     │
│      mentors from their target schools                 │
└─────────────────────────────────────────────────────────┘
```

### Availability Page Banner
```
┌─────────────────────────────────────────────────────────┐
│ ℹ  Set Your Availability                          [×]  │
│                                                         │
│    Configure when you're available for mentorship      │
│    sessions. Students will only be able to book time   │
│    slots within your availability.                     │
│                                                         │
│    • Set recurring weekly hours for your regular       │
│      schedule                                          │
│    • Use date overrides for holidays, vacations, or    │
│      one-time changes                                  │
│    • You can always update your availability later     │
└─────────────────────────────────────────────────────────┘
```

### Event Types Page Banner
```
┌─────────────────────────────────────────────────────────┐
│ ℹ  Configure Your Session Types                   [×]  │
│                                                         │
│    Choose which types of sessions you want to offer    │
│    and set your pricing. You can offer free sessions,  │
│    paid sessions, or a mix of both.                    │
│                                                         │
│    • Start with free sessions to build reviews and     │
│      reputation                                        │
│    • Stripe is only required if you want to charge     │
│      for sessions                                      │
│    • You can enable multiple session lengths (15, 30,  │
│      or 60 minutes)                                    │
│    • Pricing can be updated anytime                    │
└─────────────────────────────────────────────────────────┘
```

## Quick Setup Dialog

```
┌─────────────────────────────────────────────────────────┐
│ ✨ Quick Setup Wizard                                   │
│                                                         │
│ Get started quickly with recommended default settings. │
│ You can customize everything later.                    │
│                                                         │
│ ☑ Start with free sessions only                        │
│   Skip Stripe setup and offer free mentorship to       │
│   build your reputation                                │
│                                                         │
│ ☑ Set default availability                             │
│   Mon-Fri, 9 AM - 5 PM (your local time). You can     │
│   customize later.                                     │
│                                                         │
│ ☑ Enable all event types                               │
│   15, 30, and 60-minute sessions all set to free       │
│                                                         │
│ ℹ Note: You'll still need to complete your profile     │
│   (bio and photo) manually to activate your account.   │
│                                                         │
│                              [Cancel] [Apply Quick Setup]│
└─────────────────────────────────────────────────────────┘
```

## Collapsible Help Section

```
┌─────────────────────────────────────────────────────────┐
│ ℹ  Need Help?                                  [Toggle] │
│                                                         │
│ Getting Started Tips:                                   │
│ • Complete steps in any order that works for you       │
│ • You can offer only free sessions - Stripe is         │
│   optional in that case                                │
│ • Your profile won't be visible to students until all  │
│   required steps are done                              │
│ • You can always edit your settings later              │
│                                                         │
│ Common Questions:                                       │
│ • Do I need Stripe? Only if you want to charge for     │
│   sessions                                             │
│ • How long does setup take? Most mentors complete it   │
│   in 10-15 minutes                                     │
│ • Can I change my pricing later? Yes, anytime in       │
│   Event Types settings                                 │
│                                                         │
│ If you have questions about setting up your mentor     │
│ profile, check out our Getting Started Guide or reach  │
│ out to support@discuno.com.                            │
└─────────────────────────────────────────────────────────┘
```

## Visual Design Tokens

### Colors Used
- **Blue (Info/Welcome)**: `border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20`
- **Green (Success/Complete)**: `border-green-500/50 bg-green-50/50 dark:bg-green-950/20`
- **Amber (Warning/Missing)**: `border-amber-200 bg-amber-50 dark:bg-amber-950/20`
- **Yellow (Attention)**: `border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20`

### Icons Used
- ✓ CheckCircle2 - Completed steps
- ○ Circle - Incomplete steps
- ℹ Info - Help sections and banners
- ⚠ AlertCircle - Missing items warnings
- ✨ Sparkles - Quick Setup feature
- 🚀 Rocket - Welcome and success messages
- 👤 User - Profile step
- 📅 CalendarDays - Availability step
- 💳 CreditCard - Stripe step
- 📚 BookOpen - Event types step
- 💰 DollarSign - Pricing step
- 🕐 Clock - Estimated time

### Badge Variants
- **Optional**: `variant="secondary"` - Gray background
- **Completed**: `variant="outline"` - Green text with outline
- **Time Estimate**: `variant="outline"` - Default color with clock icon
- **Progress**: `variant="secondary"` - Shows "X of Y completed"

## Responsive Behavior

### Mobile (< 640px)
- Stack all elements vertically
- Full-width buttons
- Collapse badge groups to stack
- Hide some decorative icons
- Maintain all functionality

### Tablet (640px - 1024px)
- Two-column layouts where appropriate
- Side-by-side action buttons
- Maintain desktop styling for most elements

### Desktop (> 1024px)
- Full three-column layouts on profile page
- Side-by-side next steps on completion
- All tooltips and badges visible
- Optimal spacing for readability

## Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Quick Setup dialog can be closed with Escape
- Collapsible sections can be toggled with Enter/Space

### Screen Readers
- All icons have text alternatives
- ARIA labels on close buttons
- Alert roles for important messages
- Proper heading hierarchy

### Color Contrast
- All text meets WCAG AA standards
- Icons have sufficient contrast
- Dark mode variants maintain contrast
- Color is not the only indicator of status

## Animation and Transitions

### Smooth Transitions
- Banner dismissal: fade out + slide up
- Collapsible sections: smooth expand/collapse
- Progress bar: animated fill
- Step completion: subtle scale + color change

### No Motion Preference
- Respects `prefers-reduced-motion`
- Falls back to instant transitions
- Maintains all functionality without animation
