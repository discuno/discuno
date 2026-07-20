# separator

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/separator.tsx:1` uses the callable Base Separator and no Radix `decorative` prop.
- Existing Item, ButtonGroup, Sidebar, and settings consumers compile unchanged; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Decorative borders expressed directly in layout CSS were not converted.

## Behavior changes

- The component is semantic by default (`role="separator"`); purely visual rules should remain CSS borders or aria-hidden divs.

## Verify by hand

- Inspect horizontal and vertical separators for orientation, spacing, and accessible role.
