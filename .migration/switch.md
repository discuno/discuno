# switch

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/switch.tsx:1` now uses Base Switch Root/Thumb and Base checked attributes.
- Existing privacy, availability, and session consumers compile unchanged; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Switch-controlled mutations and persistence semantics were unchanged.

## Behavior changes

- The visible root is a span with a hidden native input rather than Radix's button-root model.

## Verify by hand

- Toggle analytics, day availability, and session publishing by pointer, keyboard, and visible label; inspect disabled state.
