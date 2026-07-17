# item

2026-07-17, golden pair via the shadcn Base Luma registry; removed Radix Slot composition.

## Changed

- `apps/web/src/components/ui/item.tsx:1` now uses Base `useRender` and `mergeProps` for linked/list item composition.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No product screen consumed Item before this migration; it is ready for the redesign phase.

## Behavior changes

None.

## Verify by hand

- Render default, outline, and muted linked items; confirm one semantic link, hover state, and visible keyboard focus.
