# Discuno UI reset

This document defines the ground-up interface rebuild. The reset keeps Discuno's route, data,
authorization, analytics, booking, and payment contracts. It replaces the visual composition,
content hierarchy, and app-specific component layer.

## Product read

Discuno is a student decision service, not a generic mentor marketplace. The interface should make
one anxious question feel smaller, help a student find relevant firsthand context, and move them
into a clear booking flow. It should feel human and recognizable before it feels clever.

The visual language is warm editorial clarity:

- warm paper canvas and deep ink type;
- cobalt for the one dominant action;
- chartreuse only for a selected or highlighted phrase;
- Newsreader for short display moments and Geist for everything operational;
- real student photography and real mentor information;
- strong margins, measured rules, and open space instead of stacked cards;
- calm, conventional controls for auth, booking, payments, and mentor work.

Design dials for acquisition are variance 7, motion 5, and density 4. Product workflows reduce to
variance 3, motion 3, and density 6.

## Reset boundary

Replace freely:

- page JSX and section order;
- app navigation, footer, shells, and responsive composition;
- app-specific cards, headers, callouts, sidebars, filters, and empty states;
- visual tokens, spacing, typography, radii, borders, and motion;
- acquisition copy that is redundant or vague.

Preserve exactly:

- route paths and primary navigation labels;
- public search parameters: `school`, `major`, and `gradYear`;
- profile and booking deep links, including `eventType`;
- auth query parameters, safe return paths, form names, and OAuth behavior;
- server actions, query-layer permission checks, schemas, and financial lifecycle handlers;
- first-party profile-view analytics and explicit optional PostHog consent;
- legal meaning, school-email boundaries, cancellation rules, and payment status language;
- the anonymous session provider that secures guest booking.

The shadcn/Base UI files remain the accessibility and behavior layer. They are not the design
source. App pages should be recomposed from business jobs rather than copied from the prior UI.

## Experience architecture

### Student journey

1. **Ask** - the home hero names the decision and offers one action: find a mentor.
2. **Narrow** - a compact filter rail uses school, field, and optional graduation year.
3. **Compare** - mentor results emphasize photo, overlap, and the question each person can help with.
4. **Understand** - a profile answers who this person is, what they have lived through, and what
   sessions are available.
5. **Book** - the calendar, attendee details, review, and paid handoff use one calm task column plus a
   persistent factual summary.
6. **Resolve** - success, processing, incomplete, unavailable, and cancellation states say what
   happened and the next safe action.

Students do not need a dashboard. Browse, profile, and booking remain the whole experience.

### Mentor journey

The mentor workspace is task-led:

- **Overview** - readiness, the next incomplete setup job, and upcoming sessions;
- **Bookings** - time-ordered session management;
- **Availability** - weekly hours and date exceptions;
- **Sessions** - bookable event types, duration, price, and compatibility;
- **Public profile** - identity, firsthand context, and preview;
- **Calendar** - connection state and protected disconnect behavior.

Payout state appears where it changes a task. It does not become a decorative dashboard metric.

## Layout system

### Public pages

- Maximum reading width: 76rem, with a narrower 42rem text measure.
- Desktop hero: asymmetric 5/7 or 6/6 split, never centered by default.
- Mobile: strict single column with 1rem gutters and no rotated or overlapping content.
- Sections use open space and one separator rule. A tinted section may appear once, but the page
  does not flip themes.
- The main navigation stays one line and no taller than 4.5rem.
- The footer is a compact utility footer, not another marketing section.

### Product pages

- A stable left rail on wide screens and a simple sheet on mobile.
- One page title, one sentence of context at most, then the task.
- Lists use rows and grouped sections. Panels are reserved for real containment such as a booking
  summary, form, calendar, warning, or overlay.
- Dense controls remain flat. Status is shown with text and one semantic badge only when needed.

## Component grammar

### Allowed containment

Use a bordered surface when the boundary changes meaning or interaction:

- form groups;
- calendars and schedulers;
- booking and payment summaries;
- dialogs, sheets, popovers, and destructive confirmations;
- a single featured marketing object when it needs visual separation.

Do not wrap headings, explanatory copy, metrics, navigation links, or every list item in a card.

### Shape

- Controls and panels: 10px radius.
- Media: 12px radius.
- Pills: only status, avatar, switch, and compact filter tokens.
- No rotation on interactive elements.
- Shadows: overlays only. Hover hierarchy comes from color, rule weight, or a 1px translation.

### Type

- Display: Newsreader, short, sentence case, two lines at most in a hero.
- UI and body: Geist.
- Hero body: 20 words or fewer.
- Section descriptions: 25 words or fewer unless policy requires precision.
- No repeated eyebrow above every heading.
- No ornamental section numbers, fake field-note metadata, or decorative version labels.

### Color

- Cobalt is the only action accent.
- Chartreuse is a highlighter background with ink text. It is never a second CTA color.
- Status colors only communicate actual state.
- Dark mode keeps the same hierarchy through semantic tokens.

### Motion

- Initial hero copy and image enter once to establish hierarchy.
- Lists reveal only when the sequence helps scanning.
- Buttons provide press feedback and focus feedback.
- Route and task-state changes use opacity and transform only.
- Every nonessential transition is removed under reduced motion.

## Page blueprints

### Home

1. Split hero with one sentence, one CTA, and real student conversation photography.
2. Unboxed filter rail.
3. Mentor results, led by content rather than card chrome.
4. A compact question spectrum showing the decisions students bring.
5. Three plain-language conversation outcomes in a vertical sequence.
6. Short FAQ.
7. One mentor supply CTA.

### Mentor profile

1. Identity and relevant overlap beside a real profile image.
2. Short firsthand context.
3. Session rows with duration and price visible before the action.
4. A sticky booking summary on desktop, inline on mobile.
5. School-email language appears only when true and always uses the precise trust boundary.

### Booking

1. Mentor and selected session summary.
2. Date and time selection.
3. Attendee details with labels above controls and inline errors.
4. Review of immutable details.
5. Distinct completion behavior for free booking and paid checkout.

### Auth

1. One focused sign-in column.
2. Student and mentor intent explained in one sentence, not parallel promotional panels.
3. Provider buttons first, school-email OTP second.
4. Return-path and reauthentication behavior remain invisible unless they need explanation.

### Mentor workspace

1. Compact task navigation.
2. Page heading plus one primary action.
3. Rows, sections, and forms instead of overview card grids.
4. Loading, empty, warning, error, saved, and dirty states are designed alongside success.

## Copy rules

- Lead with the student's question or next action.
- Use `conversation` for persuasion and `session` for transactions.
- Prefer concrete nouns and verbs. Remove filler such as “unlock,” “elevate,” and “seamless.”
- Do not repeat the same explanation in a heading, paragraph, callout, and button.
- One label per CTA intent across a page.
- No fabricated reviews, outcomes, urgency, metrics, or mentor inventory.
- No em dashes in public interface copy.

## Validation

The reset is complete only when:

- core routes work with their existing URL and server contracts;
- mobile and desktop composition are intentional;
- light and dark themes preserve contrast and hierarchy;
- keyboard order, focus, names, labels, and overlay titles remain correct;
- loading, empty, error, unavailable, and payment-processing states are present;
- no rewritten acquisition page falls back to three equal cards or nested bordered panels;
- all visible copy has been read for repetition and unsupported claims;
- type checking, linting, unit tests, and Playwright smoke tests pass;
- key pages are visually inspected at mobile and desktop widths.
