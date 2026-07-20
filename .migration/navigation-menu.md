# navigation-menu

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI Navigation Menu.

## Changed

- `apps/web/src/components/ui/navigation-menu.tsx:1` now uses Base UI's Portal, Positioner, Popup, Viewport, and Icon anatomy.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- The public navigation does not consume NavigationMenu yet; adoption belongs to the redesign phase.

## Behavior changes

- Base UI's default hover-open delay is 50ms instead of Radix's 200ms, and the old skip-delay window does not exist.
- Base UI has no active-list Indicator equivalent; its Icon is trigger-local.

## Verify by hand

- In a sample navigation menu, test hover transitions, arrow keys, Escape, collision positioning, and link activation.
