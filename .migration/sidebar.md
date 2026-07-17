# sidebar

2026-07-17, golden pair via the shadcn Base Luma registry; migrated all Radix Slot and Dialog usage to Base-compatible composition.

## Changed

- `apps/web/src/components/ui/sidebar.tsx:1` uses Base `useRender`/`mergeProps`, the Base Sheet wrapper, and Base Tooltip trigger composition.
- `apps/web/src/components/app-sidebar-header.tsx:17` and `apps/web/src/components/nav-main.tsx:76` now pass Next.js links through `render`.
- `apps/web/src/components/nav-user.tsx:52` composes the account menu trigger with `render`.
- `grep -n "radix-ui\|@radix-ui"` is clean across sidebar files.

## Left alone

- `apps/web/src/components/ui/input.tsx`, `skeleton.tsx`, and `hooks/use-mobile.ts` were explicitly restored after the CLI proposed unrelated registry drift.

## Behavior changes

- Polymorphic sidebar controls now merge props through Base useRender; rendered anchors retain anchor semantics.
- Luma spacing and radius values replace the previous New York sidebar styling.

## Verify by hand

- Test desktop collapse, Cmd/Ctrl+B, rail toggle, mobile Sheet, active links, tooltips, nested links, and focus order.
