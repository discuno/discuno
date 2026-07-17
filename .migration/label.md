# label

2026-07-17, golden pair via the shadcn Base Luma registry; replaced Radix Label with a native label.

## Changed

- `apps/web/src/components/ui/label.tsx:1` renders a native `<label>` with the owned styling contract.
- Existing form and booking labels compile unchanged; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Field layout and validation messages were unchanged.

## Behavior changes

None.

## Verify by hand

- Click every visible form label and confirm it focuses or toggles the associated control.
