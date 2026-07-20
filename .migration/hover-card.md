# hover-card

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI Preview Card.

## Changed

- `apps/web/src/components/ui/hover-card.tsx:1` preserves public HoverCard names while using `@base-ui/react/preview-card` Positioner and Popup parts.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No current product consumer needed a call-site rewrite.

## Behavior changes

- Default open delay is 600ms instead of Radix Hover Card's 700ms.

## Verify by hand

- Hover and keyboard-focus a preview trigger; confirm delayed opening, pointer travel into content, Escape, and focus behavior.
