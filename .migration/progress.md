# progress

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI's computed progress model.

## Changed

- `apps/web/src/components/ui/progress.tsx:1` now nests Indicator in Track and lets Base UI calculate fill width.
- Existing onboarding progress compiles unchanged; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Progress values and onboarding completion calculations were unchanged.

## Behavior changes

- Status attributes are now `data-progressing`, `data-complete`, and `data-indeterminate` rather than Radix state values.

## Verify by hand

- Inspect 0%, partial, 100%, and indeterminate progress with a screen reader and at narrow widths.
