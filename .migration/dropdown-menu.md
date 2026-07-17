# dropdown-menu

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI Menu.

## Changed

- `apps/web/src/components/ui/dropdown-menu.tsx:1` uses Base Menu Portal, Positioner, Popup, group labels, and submenu parts.
- `apps/web/src/components/shared/UserAvatar.tsx:37`, `apps/web/src/components/nav-user.tsx:52`, and `apps/web/src/app/(app)/(layout)/nav/NavigationClient.tsx:165` use `render` and `onClick` instead of Radix composition/selection props.
- Radix anchor-width variables were replaced with `--anchor-width`; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Account actions, theme selection, sign-out behavior, and mobile navigation destinations were unchanged.

## Behavior changes

- Base checkbox/radio menu items stay open by default unless `closeOnClick` is set; Discuno currently uses ordinary items only.
- Base menus loop keyboard focus by default.

## Verify by hand

- Open account and mobile menus; test arrow keys, typeahead, Enter, Escape, link navigation, theme toggle, and focus return.
