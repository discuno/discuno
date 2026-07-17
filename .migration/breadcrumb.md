# breadcrumb

2026-07-17, golden pair via the shadcn Base Luma registry; migrated the polymorphic link to Base UI rendering.

## Changed

- `apps/web/src/components/ui/breadcrumb.tsx:1` replaces Radix Slot with Base `useRender` and `mergeProps`.
- `apps/web/src/app/(app)/(mentor)/settings/components/SettingsHeaderClient.tsx:68` uses `render` for its Next.js link.
- `grep -n "radix-ui\|@radix-ui"` is clean for both files.

## Left alone

- Breadcrumb route labels and responsive truncation were unchanged.

## Behavior changes

None.

## Verify by hand

- Navigate mentor settings with keyboard and confirm the breadcrumb link remains an anchor with visible focus.
