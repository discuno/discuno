# Discuno visual system

Discuno should feel like a thoughtful set of field notes passed from one student to another: useful,
specific, optimistic, and candid. The interface must remain recognizable even when the logo is not
visible.

## Brand idea

**Decision field notes** combines familiar product patterns with a small set of repeatable Discuno
assets:

- warm paper surfaces;
- deep ink text;
- cobalt actions and navigation;
- one chartreuse highlighter accent;
- Newsreader for display headings and Geist for UI/body text;
- ruled fields, margin lines, note stamps, question slips, and restrained offset shadows.

This is an editorial system, not a scrapbook treatment. Do not add handwritten fonts, fake tape to
every card, loud rotations, faux testimonials, or decorative clutter.

## Experience principles

1. **Familiar flow, distinctive expression.** Navigation, forms, calendars, and checkout should work
   like recognizable software. Identity comes from typography, color, hierarchy, rules, and a few
   repeated brand assets—not novel interaction semantics.
2. **The question is the hero.** Acquisition pages lead with the decision a student is trying to
   make. Real mentor context follows. Mechanics appear when they reduce uncertainty.
3. **Expression follows consequence.** Marketing pages may use several field-note assets together.
   Profiles use fewer. Booking, authentication, payment, and mentor settings are calmer and keep
   decoration away from dense controls.
4. **One dominant action.** Cobalt identifies the primary next step. Chartreuse highlights context,
   selection, or a secondary moment of delight; it does not compete with every action.
5. **Earn trust with clarity.** Never invent social proof. Keep school-email, payment, cancellation,
   and availability language precise.

## Implementation

The source tokens and reusable signature classes live in `apps/web/src/styles/globals.css`.

- Use semantic colors (`background`, `foreground`, `card`, `primary`, `accent`, `highlight`) instead
  of introducing page-specific hex values.
- Use shadcn/ui on Base UI for behavior and accessibility. Base UI is the interaction foundation,
  not the visual identity.
- Keep controls around 8–12px corner radii. Pills are reserved for intrinsically pill-shaped status,
  avatar, progress, radio, and switch patterns.
- Use `.display-title`, `.field-notes`, `.field-notes-ink`, `.note-stamp`, `.marker-underline`,
  `.question-slip`, `.paper-panel`, `.surface-panel`, `.stacked-note`, `.corner-mark`, and
  `.ink-shadow` rather than recreating the motifs per page.
- Primary buttons may use the small offset press shadow. Outline, ghost, and dense dashboard
  controls remain flat.
- Overlays use a solid paper surface, visible border, compact radius, and restrained shadow. Avoid
  glass cards, blurred color orbs, generic blue-purple gradients, and large floating shadows.
- Add registry components only for a real job. For example, a chart requires trustworthy time-series
  data and an actionable mentor question; do not add one as dashboard decoration. A carousel should
  not hide mentor inventory merely to create motion.

## Accessibility guardrails

- Preserve Base UI semantics, labels, keyboard behavior, focus rings, and hit areas.
- Body and muted token pairs must meet WCAG AA contrast. Chartreuse is a background/highlight with
  ink text; never use it as low-contrast text or the only status signal.
- Keep serif type to display headings. Body copy and controls remain Geist with readable line length
  and leading.
- Static rotations are limited to non-interactive decorative notes. Reading order never follows the
  visual rotation.
- Keep notebook rules low contrast and out of dense form interiors. Forced-colors mode removes the
  textures; reduced-motion mode removes nonessential interaction movement.
- Validate light/dark themes and mobile/desktop layouts after changes.

## Research basis

The system deliberately balances processing fluency and prototypicality with a few unique,
repeatable brand assets. It also follows research showing that expressive shape, color, size, and
containment can improve preference and direct attention when functionality stays clear.

- [Google Research, “The role of visual complexity and prototypicality regarding first impression
  of websites”](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)
- [Google Design, “Expressive Design: Google's UX
  Research”](https://design.google/library/expressive-material-design-google-research)
- [Ehrenberg-Bass Institute, “Brands of
  Distinction”](https://marketingscience.info/brands-of-distinction/)
- [W3C WAI, “Designing for Web Accessibility”](https://www.w3.org/WAI/tips/designing/)

Established brands informed the discipline, not the surface treatment: Mailchimp's confident color
asset, Dropbox's flexible editorial system, Duolingo's repeated shape language, and Headspace's calm
progressive disclosure all demonstrate how a small number of consistent choices can carry identity.
Discuno's notebook rules, question slips, cobalt actions, and chartreuse marks are its own system;
do not reproduce another company's illustrations, voice, or layouts.

Public language remains governed by `docs/positioning.md`.
