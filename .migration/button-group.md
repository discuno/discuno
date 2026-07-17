# button-group

2026-07-17, golden pair via the shadcn Base Luma registry; removed the Radix Slot dependency.

## Changed

- `apps/web/src/components/ui/button-group.tsx:1` uses Base `useRender` composition and the Base-compatible separator.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No product screen consumed ButtonGroup before this migration.

## Behavior changes

None.

## Verify by hand

- Render horizontal and vertical groups with text and buttons; confirm borders join and keyboard focus is visible.
