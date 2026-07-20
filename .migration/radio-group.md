# radio-group

2026-07-17, golden pair via the shadcn Base Luma registry; migrated the new wrapper to Base UI.

## Changed

- `apps/web/src/components/ui/radio-group.tsx:1` uses Base `RadioGroup` plus `Radio.Root` and `Radio.Indicator`.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- No product screen consumed RadioGroup before this migration; it is ready for session and availability redesigns.

## Behavior changes

- Arrow-key navigation automatically supports both axes; Radix's orientation/loop controls are not exposed.

## Verify by hand

- Test pointer selection, arrow keys, label activation, required, disabled, and form submission states.
