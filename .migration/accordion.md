# accordion

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/accordion.tsx:1` now uses `@base-ui/react/accordion`, `Panel`, array-valued roots, and Base data attributes.
- `apps/web/src/app/(app)/(public)/support/page.tsx:143` removes Radix-only `type` and `collapsible` props from all FAQ groups.
- `grep -n "radix-ui\|@radix-ui"` is clean for both files.

## Left alone

- FAQ copy and section order were intentionally unchanged during the primitive migration.

## Behavior changes

- Base UI single accordions are always collapsible; that matches the former explicit configuration here.

## Verify by hand

- Open and close each Support FAQ with mouse, Enter, and Space; confirm focus remains on its trigger.
