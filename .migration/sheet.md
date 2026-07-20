# sheet

2026-07-17, golden pair via the shadcn Base Luma registry; migrated the dialog-derived sheet to Base UI.

## Changed

- `apps/web/src/components/ui/sheet.tsx:1` now uses Base Dialog Backdrop, Popup, Close, and side-specific transitions.
- `apps/web/src/components/ui/sidebar.tsx:185` consumes the public Sheet wrapper for the mobile workspace.
- `grep -n "radix-ui\|@radix-ui"` is clean for both files.

## Left alone

- `apps/web/src/components/ui/drawer.tsx` remains Vaul because it is not a Radix primitive.

## Behavior changes

- Sheet presence and transitions use Base open/closed attributes and Base focus/dismissal behavior.

## Verify by hand

- Open the mentor sidebar on mobile; test swipe/scroll interaction, backdrop, Escape, close action, and focus return.
