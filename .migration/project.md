# Discuno Radix to Base UI migration

2026-07-17, whole-project migration using official shadcn Base Luma golden pairs plus the documented consumer-prop transformation engine. Verdict: complete; 0 wrappers remain on Radix.

## Baseline

- Branch: `codex/modernize-discuno-2026`.
- Clean baseline commit: `cb2ad64`.
- Before dependency changes, `pnpm typecheck` and the full Next.js production build passed.

## Foundation changes

- `apps/web/components.json` now targets `base-luma`; `shadcn info --json` reports `base: "base"`.
- `apps/web/package.json` and `pnpm-lock.yaml` add `@base-ui/react` and the official `shadcn` Tailwind utilities, and remove every direct `@radix-ui/*` dependency.
- `apps/web/src/styles/globals.css` imports `shadcn/tailwind.css` so Base presence/state variants compile, while retaining Discuno's semantic cobalt/mist theme tokens.
- `renovate.json` now groups `@base-ui/*` updates instead of obsolete Radix packages.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, both READMEs, and the project-local shadcn skills describe the new foundation.

## App-code sweep

- Replaced Radix `asChild` with Base `render` across public, auth, navigation, and mentor settings consumers.
- Converted menu `onSelect` handlers to click handlers, renamed provider delay props, replaced Radix CSS variables, removed Accordion-only props, grouped Select options, supplied Base Select item metadata, and removed the direct Radix Select implementation from booking.
- The source scan `rg "@radix-ui|from ['\"]radix-ui['\"]|\\basChild\\b|--radix-" apps/web/src` returns no migration leftovers.

## Intentionally left alone

- `apps/web/src/components/ui/command.tsx` remains cmdk; only its obsolete Radix Dialog type import was removed.
- `drawer.tsx` remains Vaul, `sonner.tsx` remains Sonner, `input-otp.tsx` remains input-otp, and `calendar.tsx` remains react-day-picker.
- `input.tsx`, `skeleton.tsx`, and `hooks/use-mobile.ts` were restored after Sidebar's registry dependency expansion proposed unrelated changes.

## Flagged behavior deltas

- Tabs now use Base UI's manual keyboard activation default.
- Navigation Menu opens faster by default (50ms versus 200ms) and has no Radix skip-delay window or active-list Indicator.
- Checkbox and radio menu items stay open by default unless `closeOnClick` is explicitly enabled; Discuno currently has no such consumers.
- Base collision padding, portal wrappers, focus handling, and form-control root elements differ as documented in the per-component reports.
- The public visual language moves from customized legacy New York wrappers to Luma's rounded, denser component geometry, as authorized for the redesign.

## Verification

- `pnpm typecheck`: passed.
- `pnpm typecheck:tests`: passed.
- `pnpm lint`: passed with zero warnings.
- `pnpm test:run`: 71 files and 491 tests passed.
- `SKIP_ENV_VALIDATION=1 BETTER_AUTH_PRODUCTION_URL=https://preview.discuno.com pnpm build:web`: passed; the only messages were the pre-existing database-unavailable sitemap fallbacks.
- Manual browser QA remains required for focus return, menu typeahead, mobile Sheet interaction, Select alignment, Tooltip timing, and Tabs activation before deployment.
