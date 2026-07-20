# checkbox

2026-07-17, golden pair via the shadcn Base Luma registry; migrated cleanly to Base UI.

## Changed

- `apps/web/src/components/ui/checkbox.tsx:1` now uses `@base-ui/react/checkbox` and Base checked/indeterminate attributes.
- `apps/web/src/components/ui/field.tsx:111` updates choice-card styling from Radix state selectors to `data-checked`.
- `grep -n "radix-ui\|@radix-ui"` is clean for both files.

## Left alone

- Form schemas and submitted checkbox values were unchanged.

## Behavior changes

- The visible root is a span with a hidden native input rather than Radix's button-root model.

## Verify by hand

- Toggle by pointer, Space, and associated label; inspect checked, unchecked, disabled, and invalid states.
