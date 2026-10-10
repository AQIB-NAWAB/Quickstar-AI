# Frontend deployment

Import this repository into Vercel and set **Root Directory** to `apps/web`.
Keep access to files outside the Root Directory enabled so Vercel can use the
repository's pnpm workspace and lockfile. The `vercel.json` in this directory
builds only the Next.js frontend; backend services are deployed separately.

When connecting the frontend to a deployed backend, set
`NEXT_PUBLIC_GATEWAY_URL` to its public gateway URL before building.

## Ignition logo and companion

The supplied `newLogo` artwork is published under `public/brand`. `BrandLogo`
preserves its flame silhouette and transparent eyes; the navbar, footer, app shell,
coming-soon page, and favicon use the new mark.

The landing-page `BrandCompanion` is hidden on load, then enters from a random
point on one of the four viewport edges when the pointer arrives or a content
control receives focus. A damped spring returns it to a bottom-right resting position with a 24px edge
inset. Hover placement uses the rendered character size and an 18px clearance,
choosing another side when an edge has insufficient room. Hints and connectors
appear after arrival. The body does not follow the cursor or arbitrary clicks;
the eyes continue tracking the pointer.
Hovering or focusing content controls shows authored hints and a connecting line;
navbar controls are excluded. The character samples its visible background while
traveling: orange surfaces use a black mark, dark/medium grey surfaces use white, and
lighter grey surfaces use black for contrast. The mark samples its footprint
at panel edges. Each short connector segment and the hollow endpoint adapt to
the background directly beneath them. There is no white outline. Pointer intent takes
over from keyboard focus, and delayed leave/blur events cannot erase newer hints. It never activates controls on its own.

The guide has no pause or close buttons. Its tooltip explains that three quick
taps (at most 1.2 seconds between taps) hide it until the next page load. Single
taps play a greeting animation, and the character holds still while being tapped.
The navbar's gaze follows the pointer across the full tab. Reduced-motion settings
remove travel interpolation and greeting motion; hidden-page animation loops sleep.

Playback, expression interpolation, and blinking use
`@bible-strong/avatar-core` 0.1.0 from
[Bible Strong Avatar Lab](https://github.com/smontlouis/bible-strong-avatar-lab).
The custom renderer applies runtime values to our SVG, so React 18 is supported
without using the upstream React 19 renderer. The upstream dependency is licensed
AGPL-3.0-only; its license is included in the installed package. Node 22.12+ is
required by that dependency.

## Source layout

See **[docs/FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md)** for how `features/`, `components/`, and `lib/server` are organized for parallel work.

## Staff app (F1) — local dev

1. Start the data plane and backend: `make up`, identity (3001), workspace (3002), gateway (3000).
2. Copy env: `cp .env.local.example .env.local`
3. Run the app: `pnpm --filter @quickstart/web dev` → http://localhost:3005
4. Register at `/register` or sign in at `/login`. Sessions use **httpOnly** cookies via `/api/auth/*` Route Handlers.

Protected routes: `/workspaces/[workspaceId]/*` (middleware + silent refresh).

## Inbox (F4)

Staff inbox at `/workspaces/[workspaceId]/inbox` calls the gateway through **BFF** routes under `/api/workspaces/.../conversations` (access token from httpOnly cookies). The thread view loads the last ~50 messages, polls `after_seq` every 3s, supports take/release, human send, and a printable transcript.

## Landing page consistency

The landing page's shared container, heading, description, eyebrow, and spacing
styles live in `src/app/landing.css`, scoped to `.landing-page`. Reuse those classes
for equivalent roles when adding sections. The audit and maintenance rules are
documented in [docs/ui-audit.md](../../docs/ui-audit.md).

## Hairline interactions

The official `@lucasmarkes/hairline` 0.5 runtime supplies the small contextual
illustration below the team-control tabs: version history, separate compartments,
and an access dial. Only the selected illustration is mounted. Its palette matches
the landing page; motion starts on pointer input or the optional Preview control,
sleeps offscreen, and respects reduced motion. The illustration is omitted below
1100px to keep the existing mobile controls compact. These objects illustrate the
features; the adjacent demo remains the place to edit drafts and select roles.

The hero conveyor's captions also select their stations on hover or focus. Left
and right arrow keys move between stations, and Escape clears the selection.
Station explanations appear below the drawing on every screen size.
