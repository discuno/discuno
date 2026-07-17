# dialog

2026-07-17, golden pair via the shadcn Base Luma registry; migrated overlays to Base UI.

## Changed

- `apps/web/src/components/ui/dialog.tsx:1` now uses Base UI Backdrop and Popup anatomy.
- Existing login, booking, command, and availability dialog consumers compile against Base UI.
- `grep -n "radix-ui\|@radix-ui"` is clean across dialog files and consumers.

## Left alone

- `apps/web/src/components/ui/command.tsx` remains cmdk; only its obsolete Radix Dialog type import was replaced with the public Dialog component type.

## Behavior changes

- Base UI consolidates outside/escape dismissal through root change reasons; no consumer depended on Radix-specific dismissal callbacks.

## Verify by hand

- Open login, booking, and availability dialogs; confirm focus trap, Escape, backdrop dismissal, scroll lock, and focus return.
