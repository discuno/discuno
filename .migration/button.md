# button

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to the real Base UI Button primitive.

## Changed

- `apps/web/src/components/ui/button.tsx:1` now uses `@base-ui/react/button` and Luma variants/sizes.
- Link-button consumers in public, auth, navigation, and mentor settings routes now use `render={<Link />}` plus `nativeButton={false}` instead of `asChild`.
- `apps/web/src/app/(app)/(mentor)/settings/bookings/components/BookingListItem.tsx:82` uses the supported destructive variant.
- `grep -n "radix-ui\|@radix-ui"` is clean across the wrapper and all consumers.

## Left alone

- Submit/loading logic and destination URLs were intentionally unchanged.

## Behavior changes

- Removed project-only `tinted`, `gray`, `plain`, and `destructive-ghost` variants; only `destructive-ghost` had a consumer and it now uses Luma's subtle destructive variant.
- Luma buttons are slightly denser and more rounded than the former custom New York buttons.

## Verify by hand

- Tab through link buttons and submit buttons; confirm anchors navigate, form buttons submit, disabled states block clicks, and focus rings remain visible.
