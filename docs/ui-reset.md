# Discuno product experience reset

This document defines Discuno as a question-first student guidance product. The implementation
keeps the scheduling, payment, authentication, authorization, analytics-consent, and data contracts
that make the product safe. It replaces the page architecture, content hierarchy, application shell,
and app-specific presentation.

## Product thesis

Discuno is not a directory with a booking button. It helps one student carry one real college
decision into a useful conversation with someone who has relevant firsthand context.

The core path is:

`question -> relevant context -> person -> session -> clearer next move`

The student's question remains the primary object throughout the experience. It begins in the home
composer, becomes a compact context line in discovery, remains visible on a mentor profile, and
prefills the required booking question.

Discuno does not claim semantic question matching until the product has a controlled topic taxonomy
and trustworthy ranking support. Current discovery narrows only by school, field, and graduation
year. The interface says that plainly.

## Design read

This is a greenfield-feeling consumer product for students facing a concrete college decision. The
visual language is candid, campus-editorial, and calm. Acquisition pages can be asymmetric and
expressive. Profiles, auth, booking, and mentor work become progressively quieter as consequence
increases.

Design dials:

- Public acquisition: `DESIGN_VARIANCE: 7`, `MOTION_INTENSITY: 4`, `VISUAL_DENSITY: 3`
- Discovery and profiles: `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 4`
- Auth, booking, and mentor work: `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 2`,
  `VISUAL_DENSITY: 5`

The visual foundation remains Discuno's warm editorial clarity: warm paper, deep ink, cobalt action,
one chartreuse context highlight, Newsreader display type, Geist UI type, and documentary student
photography. Base UI supplies accessible behavior. It is not the visual design source.

The brand mark's three connected points become a single functional journey cue: `question -> person
-> time`. Use it once where the journey needs explanation. Do not repeat it as decorative chrome.

## Shell model

- Marketing pages (`/`, `/about`, `/for-mentors`, and `/blog`) may use the full public navigation
  and compact public footer.
- Discovery and mentor profiles keep the public navigation but frontload filters, people, session
  evidence, and the student's question instead of marketing explanation.
- Booking and booking status use a quiet transaction shell with only the Discuno brand and a safe
  exit. They do not inherit acquisition navigation or the public footer.
- Auth has its own focused utility shell.
- Mentor settings use the stable workspace rail. Public navigation never fetches full mentor setup
  or payout readiness.

## Product boundaries

Preserve:

- protected query-layer permission checks and all server-side validation;
- Cal.com and Stripe lifecycle, reconciliation, reservation, and retry behavior;
- anonymous browsing and booking;
- authentication return paths, OAuth behavior, OTP behavior, and form names;
- profile-view ranking events and opt-in-only PostHog analytics;
- public profile, booking, success, cancellation, legal, and callback deep links;
- public filter parameters `school`, `major`, and `gradYear` for compatibility;
- event type deep links through `eventType`;
- exact school-email, payment, cancellation, refund, and processing meanings.

Replace:

- homepage and discovery responsibilities;
- navigation, footer, public shells, and mentor workspace shell;
- page composition, app-specific panels, rows, filters, empty states, and summaries;
- acquisition copy that does not help a student name or act on a decision;
- card grids and repeated bordered containers used as default structure.

## Privacy rule for the question

The student's raw question is sensitive context. Before the student intentionally submits booking
details, it is discovery context rather than transaction data.

- Store the discovery copy only in versioned browser `sessionStorage`.
- Never put it in a URL, route parameter, page or SEO metadata, pageview, log, or analytics
  property.
- Keep it editable through discovery, profile, and booking until a paid attempt locks its immutable
  snapshot.
- When the student submits booking details, treat the validated topic as booking transaction data
  under the existing provider and immutable Checkout snapshot contract. Do not imply that the
  submitted topic remains browser-only.
- Use the existing 3-200 character booking validation before provider submission.
- Clear it naturally with the browser session. Do not persist it across devices.

## Page inventory

### `/` - ask

The homepage has one job: help the student begin with the decision.

1. A question composer and one original decision-moment photograph fit in the initial viewport.
2. The composer asks, "What are you trying to decide?" and moves to `/find` without exposing the
   answer in the URL.
3. A small set of real mentor rows demonstrates the available overlap without turning the page into
   a directory.
4. One documentary conversation image explains what firsthand context changes.
5. A compact trust statement defines school-email confirmation and the role of peer perspective.

No FAQ, feature grid, testimonial placeholder, pricing page, or marketing card stack belongs here.

### `/find` - narrow and compare

Discovery has one job: help the student compare relevant people honestly.

1. Keep the question visible in an editable context line.
2. Explain that filters narrow by known profile context, not semantic question analysis.
3. Use school, field, and optional graduation year controls in a refinement rail on desktop and a
   titled filter sheet on mobile.
4. Show mentors as editorial rows with portrait, name, school, field, academic stage, mentor-written
   context, session availability, and one profile action.
5. Preserve pagination, loading, retry, and empty behavior.
6. Keep legacy root filter URLs working by redirecting them to `/find`.

Never show invented relevance scores, availability claims, topic tags, or "best match" labels.

### `/mentor/[username]` - decide if this person fits

The profile answers four questions in order:

1. Who is this student?
2. What firsthand context have they chosen to share?
3. What sessions do they actually offer?
4. What does booking require?

The persistent student question sits above the profile as context. The profile uses a strong media
and identity composition, open biography text, session rows, and one legitimate booking panel.
School-email language appears only when the underlying flag is true and never implies identity,
expertise, background, credentials, or outcomes.

### `/mentor/[username]/book` - complete one safe transaction

Booking is the calmest public surface.

- A wide task column holds session selection, calendar, time, student question, contact details,
  review, processing, and confirmation.
- One sticky factual summary holds mentor, session, duration, time, timezone, and price.
- Progress labels use real tasks: `Time`, `Question`, and `Review`.
- The stored question prefills the existing required field and remains editable until attempt lock.
- Errors stay inline and preserve prior selections.
- Paid and free completion language reflects the authoritative provider state.

No decorative countdown, celebratory animation, hidden timezone, or duplicated CTA is allowed.

### `/booking/success` - state what is authoritative

Separate payment received, payment processing, booking confirmed, incomplete checkout, and unsafe or
unavailable outcomes. Give one safe next action. A paid checkout is never described as a confirmed
booking before provider confirmation.

### `/auth` - utility, not persuasion

Use one focused form surface with provider options first and email OTP second. Explain student and
mentor intent only when it changes the path. Browsing and booking remain account-free. Mentor tools
require the supported school-account path.

### `/for-mentors` - explain the responsibility

Lead with the questions a mentor can help another student think through. Explain eligibility,
scheduling control, free or paid sessions, the 85/15 economics, and responsibilities without income
hype. Use one `Start mentoring` action.

### `/blog` and `/blog/[slug]` - frame real decisions

College guides capture decision-led demand. Each article helps the reader ask a better question and
ends with `Find someone who's been there`. Generic student-life filler does not belong here.

### `/about`, `/support`, `/privacy`, and `/terms`

- About explains why firsthand context is useful and where official guidance still belongs.
- Support is task-based: booking, cancellation, refunds, scheduling, school email, accounts, and
  safety. Vendor names are acceptable here.
- Privacy and Terms retain their legal meaning, consent controls, cancellation boundaries, and
  essential-session explanations.

Do not add student dashboards, community pages, pricing pages, or testimonial pages without real
product evidence.

## Mentor workspace

The workspace is task-led, not a KPI dashboard.

- **Today**: next setup action and upcoming sessions, led by the student's question where available.
- **Sessions**: chronological booking management and actual status.
- **Availability**: weekly hours and date exceptions in one scheduling work surface.
- **Session types**: title, duration, price, compatibility, and publish state.
- **Public profile**: firsthand context, profile fields, photo, and restrained preview.
- **Calendar**: connection state and protected connect or disconnect actions.
- **Payouts**: show setup or hold state only where it changes an action.

Desktop uses a stable task rail. Mobile uses compact task navigation and labeled rows. Saved, dirty,
loading, empty, unavailable, warning, and error states are designed alongside success.

## Visual grammar

- Public canvas: 76rem. Reading measure: 42rem.
- Acquisition: asymmetric 12-column compositions. Mobile: strict single column with 1rem gutters.
- Controls and functional panels: 10px radius. Media: 12px radius. Pills only when semantically
  intrinsic.
- One quiet rule and open space replace nested containers.
- Cobalt is the only action accent. Chartreuse marks selected context and never becomes another CTA.
- Newsreader is limited to short display headings and the student's question as content.
- Shadows belong to overlays. Hover uses color, border weight, image scale, or a 1px press.
- One theme applies across a page. Semantic tokens preserve the hierarchy in dark mode.
- Documentary photography contains no text overlay, fake caption, school logo, graduation cliche,
  or fabricated interface.

## Motion

The signature transition is question continuity. The composer leaves and the compact question
context enters in roughly 220-280ms. This communicates that the student's intent carried forward.

Result changes use opacity and an 8px transform. Images may scale to 1.015 on hover. Buttons move by
1px on press. Booking and workspace motion communicates state only. Reduced-motion mode makes every
transition immediate.

No parallax, scroll hijack, marquee, perpetual animation, custom cursor, decorative status dot, or
unmotivated reveal belongs in the product.

## Navigation

Desktop navigation stays one line and below 72px:

- Find a mentor
- How it works
- College guides
- Start mentoring
- Sign in or workspace access

About, Support, Privacy, and Terms move to the footer. `How it works` returns to the relevant home
section. `Find a mentor` points to `/find`.

## Acceptance criteria

- Before booking submission, the raw question never leaves session storage or appears in URLs,
  page metadata, logs, or analytics. Once submitted, it follows the existing booking transaction
  contract and still never enters URLs, logs, or analytics.
- The question survives home, discovery, profile, and booking within one browser session.
- Discovery describes only supported filter behavior.
- Legacy root filter links and `eventType` booking links still work.
- Anonymous free and paid booking remain account-free.
- Profile navigation preserves first-party ranking events without adding question data.
- Core pages work at desktop and mobile widths in light and dark modes.
- Hero text and action fit in the initial viewport.
- Every multi-column layout has an explicit single-column fallback.
- Forms retain labels, errors, keyboard order, focus management, and provider-safe processing states.
- New pages contain no em dashes, generic card grids, duplicate CTA intent, invented proof, or fake
  match claims.
- Lint, formatting, type checks, unit tests, production build, Playwright smoke, and visual review
  pass before Preview deployment.
