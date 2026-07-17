# tooltip

2026-07-17, golden pair via the shadcn Base Luma registry; migrated to Base UI positioning and timing.

## Changed

- `apps/web/src/components/ui/tooltip.tsx:1` uses Base Provider, Trigger, Positioner, Popup, and Arrow.
- `apps/web/src/components/ui/status-dot.tsx:36` and `apps/web/src/app/(app)/(mentor)/settings/event-types/components/EventTypeSettingsContent.tsx:209` use `delay`/`render` rather than Radix props.
- Sidebar tooltips compose through the Base trigger; `grep -n "radix-ui\|@radix-ui"` is clean.

## Left alone

- Tooltip copy and the session compatibility rules it explains were unchanged.

## Behavior changes

- Provider timing uses `delay`; Base timeout defaults differ from Radix's skip-delay window.

## Verify by hand

- Hover and keyboard-focus status/session/sidebar triggers; confirm delay feel, pointer travel, Escape, collision placement, and no tooltip on disabled-only information loss.
