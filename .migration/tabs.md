# tabs

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/tabs.tsx:1` now uses Base `Tab`, `Panel`, and active/hidden attributes.
- Auth and booking consumers compile without legacy props; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Tab values, content, and route behavior were unchanged.

## Behavior changes

- Base UI defaults to manual activation: arrow keys move focus and Enter/Space activates, rather than automatically activating on focus.

## Verify by hand

- Test auth and booking tabs with arrows, Home/End, Enter, Space, mouse, and a screen reader.
