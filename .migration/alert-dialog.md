# alert-dialog

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/alert-dialog.tsx:1` now uses Base UI Backdrop, Popup, Close, and a plain Button action.
- `apps/web/src/app/(app)/(mentor)/settings/bookings/components/BookingListItem.tsx:80` composes the cancel trigger with `render`.
- `grep -n "radix-ui\|@radix-ui"` is clean for both files.

## Left alone

- Booking cancellation policy and server mutation behavior were not changed in this primitive pass.

## Behavior changes

- The cancel control receives Base UI's default initial focus rather than Radix's cancel-specific primitive focus rule.

## Verify by hand

- Open cancellation, tab through actions, press Escape, and confirm focus returns to the Cancel button.
