# collapsible

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/collapsible.tsx:1` now uses Base UI `Panel` and `render` composition.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No current product consumer required a call-site rewrite.

## Behavior changes

None.

## Verify by hand

- Toggle a collapsible with pointer and keyboard and confirm content mounts, animates, and remains reachable.
