# avatar

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/avatar.tsx:1` now uses `@base-ui/react/avatar` and Base fallback timing.
- Existing avatar consumers compile without API changes; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Image URLs, fallback initials, and user data handling were unchanged.

## Behavior changes

- The primitive's fallback delay prop is now named `delay`; no consumer supplied the old prop.

## Verify by hand

- Load a valid avatar and a broken image URL; confirm fallback initials appear without layout shift.
