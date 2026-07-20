# aspect-ratio

2026-07-17, golden pair via the shadcn Base Luma registry; replaced with the CSS-native Base-compatible wrapper.

## Changed

- `apps/web/src/components/ui/aspect-ratio.tsx:1` now renders a div with native `aspect-ratio` styling.
- `grep -n "radix-ui\|@radix-ui"` is clean for the wrapper.

## Left alone

- Media consumers and object-fit choices were intentionally unchanged.

## Behavior changes

None.

## Verify by hand

- Resize any aspect-ratio media and confirm its configured proportions remain stable.
