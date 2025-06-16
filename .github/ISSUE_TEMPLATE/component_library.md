---
name: 🧩 Component Library Issue
about: Issues related to @discuno/atoms components
title: '[ATOMS] '
labels: ['component-library', 'atoms', 'needs-triage']
assignees: ''
---

## Component Information

- **Component Name**: [e.g. Button, Avatar, BookingCard]
- **Package Version**: @discuno/atoms@[version]
- **Issue Type**: [ ] Bug / [ ] Enhancement / [ ] New Component / [ ] Documentation

## Description

A clear and concise description of the issue or enhancement needed.

## Current Behavior (for bugs)

Describe what the component currently does that's incorrect.

## Expected Behavior

Describe what the component should do.

## Component Category

- [ ] 🎨 **UI Primitives** - Basic building blocks (Button, Input, etc.)
- [ ] 📅 **Booking Components** - Cal.com integration components
- [ ] 👤 **User Components** - Profile, avatar, user-related components
- [ ] 📱 **Layout Components** - Navigation, containers, responsive layouts
- [ ] 🔧 **Utility Components** - Hooks, providers, helper components
- [ ] 📊 **Data Display** - Tables, cards, lists, charts

## Code Example

```tsx
// Example of current usage or desired API
import { ComponentName } from '@discuno/atoms'

export function Example() {
  return <ComponentName prop1="value1" prop2="value2" />
}
```

## API Design (for new components)

```tsx
interface ComponentNameProps {
  // Define the props interface
}
```

## Visual Design

- [ ] I have design mockups/specs to attach
- [ ] This follows existing design system patterns
- [ ] This requires new design patterns
- [ ] Mobile responsiveness considerations included

## Dependencies

- **New Dependencies**: List any new dependencies needed
- **Peer Dependencies**: Any required peer dependencies
- **Cal.com Integration**: [ ] Yes / [ ] No

## Testing Requirements

- [ ] Unit tests needed
- [ ] Visual regression tests needed
- [ ] Accessibility testing required
- [ ] Integration tests with web app needed

## Documentation Updates

- [ ] Component API documentation
- [ ] Usage examples
- [ ] Storybook stories (when available)
- [ ] Migration guide (for breaking changes)

## Breaking Changes

- [ ] This is a breaking change
- [ ] Migration guide needed
- [ ] Affects existing consumers

### If breaking change, describe migration path:

```tsx
// Before
<OldAPI />

// After
<NewAPI />
```

## Browser Support

- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari
- [ ] Chrome Mobile

## Accessibility Requirements

- [ ] ARIA labels/descriptions needed
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast compliance
- [ ] Focus management

## Implementation Notes

Any specific technical considerations or constraints for implementation.

## Related Issues

Link any related issues or PRs:

- Fixes #[issue number]
- Related to #[issue number]

## Checklist

- [ ] I have searched existing issues to ensure this is not a duplicate
- [ ] I have provided a clear API design (for new components)
- [ ] I have considered accessibility requirements
- [ ] I have considered mobile responsiveness
- [ ] I have specified testing requirements
