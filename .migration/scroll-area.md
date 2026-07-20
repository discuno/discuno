# scroll-area

2026-07-17, golden pair via the shadcn Base Luma registry; migrated the new wrapper to Base UI.

## Changed

- `apps/web/src/components/ui/scroll-area.tsx:1` uses Base Root, Viewport, Content, Scrollbar, and Thumb parts.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No product screen consumed ScrollArea before this migration.

## Behavior changes

- Scrollbar visibility is CSS-driven; Radix `type` and `scrollHideDelay` props are not available.

## Verify by hand

- Test wheel, trackpad, keyboard, touch, and horizontal scrolling; confirm scrollbars appear only when needed.
