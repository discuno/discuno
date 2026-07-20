# select

2026-07-17, golden pair via the shadcn Base Luma registry plus a hand-migrated direct consumer; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/select.tsx:1` now uses Base Positioner, Popup, List, groups, scroll arrows, and item indicators.
- `apps/web/src/app/(app)/(mentor)/settings/profile/components/EditProfileContent.tsx:168` supplies `items`, null placeholders, and grouped options.
- `apps/web/src/app/(app)/(public)/mentor/[username]/book/components/booking-calendar/EventTypeSelector.tsx:1` removes its direct Radix import and uses the shared Base SelectItem/SelectGroup.
- `grep -n "radix-ui\|@radix-ui"` is clean across all select files.

## Left alone

- Selected values, form names, prices, event durations, and booking state callbacks were unchanged.

## Behavior changes

- Values may now be `null`; consumer callbacks handle no selection explicitly.
- Item alignment is controlled by `alignItemWithTrigger`, and collision padding defaults differ from Radix.

## Verify by hand

- Test profile selects and booking session type with pointer, arrows, typeahead, Escape, scrolling, disabled state, and form submission.
