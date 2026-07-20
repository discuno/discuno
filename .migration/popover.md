# popover

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI positioning.

## Changed

- `apps/web/src/components/ui/popover.tsx:1` uses Base Portal, Positioner, Popup, Title, and Description parts.
- `apps/web/src/app/(app)/(public)/(feed)/components/FilterButton.tsx:82` and `apps/web/src/app/(app)/(mentor)/settings/profile/components/EditProfileContent.tsx:204` compose triggers with `render`.
- The filter popup uses `--anchor-width`; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- cmdk-powered search lists inside the popovers remain cmdk and were not migrated.

## Behavior changes

- Base collision padding defaults to 5px rather than Radix's 0px.

## Verify by hand

- Open filter and major selectors near viewport edges; test keyboard selection, outside click, Escape, and focus return.
