# Discuno visual system

Discuno should make a difficult college decision feel easier to name and act on. The interface is
warm, direct, and editorial, with familiar product behavior and little visual noise.

## Brand idea

**Warm editorial clarity** is the owned direction:

- a warm paper canvas;
- deep ink text;
- cobalt for the dominant action;
- one chartreuse highlighter accent;
- Newsreader for short display headings and Geist for body and UI text;
- real student photography and real mentor content;
- open margins and measured rules instead of stacked containers.

The identity comes from this combination, not from simulated stationery. Do not add fake tape,
rotated notes, stamps, doodles, handwriting, paper stacks, or decorative notebook textures.

## Experience principles

1. **The decision comes first.** Acquisition starts with the question a student is trying to answer.
   Product mechanics appear only when they remove uncertainty.
2. **Content carries the interface.** Real photos, mentor context, session details, and availability
   should provide the visual interest. Chrome should stay quiet.
3. **One dominant action.** Cobalt identifies the primary next step. Chartreuse highlights context or
   selection and never competes as a second CTA color.
4. **Containment must have a job.** Use a panel for forms, calendars, summaries, warnings, and
   overlays. Do not wrap every heading, metric, or row in a card.
5. **Expression follows consequence.** Public acquisition may use an asymmetric editorial layout.
   Profiles are more restrained. Auth, booking, payment, and mentor work use calm application
   patterns.
6. **Trust comes from precision.** Never invent proof, outcomes, urgency, mentor inventory, or
   verification claims.

## Layout

- Public pages use a 76rem maximum canvas and a 42rem maximum reading measure.
- Public heroes are asymmetric on desktop and single-column on mobile. They fit in the initial
  viewport with one headline, one short paragraph, and one primary action.
- Section boundaries use space or one separator rule. Do not invert the page theme between
  sections.
- Application pages use a stable task rail, a compact page heading, and rows or grouped fields.
- Navigation remains one line and no taller than 4.5rem on desktop.
- Mobile layouts below 768px collapse to a strict single column with 1rem gutters.

## Typography and copy

- Use Newsreader only for display headings. Body copy, controls, labels, and data use Geist.
- A hero headline should fit in two lines. Hero supporting copy should stay at 20 words or fewer.
- Use sentence case and natural language.
- Do not put an eyebrow above every heading. One small contextual label per three sections is the
  maximum on acquisition pages.
- Do not add ornamental section numbers, version labels, fake field-note metadata, or repeated
  explainer copy.
- Public interface copy does not use em dashes.
- Follow `docs/positioning.md` for vocabulary and trust boundaries.

## Color

All product colors are semantic tokens in `apps/web/src/styles/globals.css`.

- `background` and `card` are warm paper surfaces.
- `foreground` is deep ink.
- `primary` is cobalt and belongs to the dominant action, active navigation, links, and focus.
- `highlight` and `accent` are chartreuse-derived context colors with ink foreground text.
- Status tokens are used only for actual success, warning, or destructive states.
- Dark mode keeps the same hierarchy through semantic variables. Pages must not add manual
  per-section dark palettes.

## Shape, borders, and elevation

- Controls and panels use a 10px radius.
- Media uses a 12px radius.
- Pills are reserved for statuses, avatars, switches, and compact tokens that are intrinsically
  pill-shaped.
- Use one quiet border. Avoid nested outlines and decorative corner marks.
- Shadows are reserved for overlays. Hover and press feedback use color, border weight, or a 1px
  transform.
- Interactive elements are never rotated.

## Components

- shadcn/ui on Base UI supplies behavior, semantics, keyboard support, and accessible state.
- Use semantic tokens and built-in component variants before adding page-specific styles.
- Forms use `FieldGroup` and `Field`; labels sit above controls and errors sit below them.
- Lists use rows and separators. Cards are not the default list item.
- Use the shared Empty, Alert, Skeleton, Spinner, and Sonner patterns for feedback.
- Overlays have a title, a solid surface, a visible border, and a compact radius.
- Add a registry component only for a real user or business job. Do not add decorative charts or
  carousels.

## Motion

- Acquisition motion may establish hierarchy through a single load-in and restrained reveal.
- Product motion communicates feedback or a state transition.
- Animate only opacity and transform.
- Buttons may translate by 1px on press.
- Respect `prefers-reduced-motion` for every nonessential animation.
- Never add scroll listeners that drive React state.

## Imagery

- Prefer commissioned or generated editorial photography showing a believable student decision
  moment.
- Avoid generic corporate stock poses, graduation-cap clichés, school logos, or fabricated UI
  screenshots.
- Generated images must not contain readable fake handwriting, fake brands, or watermarks.
- Reserve image dimensions to prevent layout shift and use `next/image` for delivery.

## Accessibility guardrails

- Preserve native and Base UI semantics, labels, keyboard behavior, focus rings, and hit areas.
- Body, muted text, controls, placeholders, and status text must meet WCAG AA contrast.
- Chartreuse is a background or highlight with ink text and is never the only status signal.
- Reading order never depends on visual position.
- Test mobile and desktop layouts plus light and dark themes.
- Design loading, empty, error, unavailable, dirty, saved, and payment-processing states alongside
  the successful state.

The implementation plan and page blueprints live in `docs/ui-reset.md`.
