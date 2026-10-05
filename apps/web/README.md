# Frontend deployment

Import this repository into Vercel and set **Root Directory** to `apps/web`.
Keep access to files outside the Root Directory enabled so Vercel can use the
repository's pnpm workspace and lockfile. The `vercel.json` in this directory
builds only the Next.js frontend; backend services are deployed separately.

When connecting the frontend to a deployed backend, set
`NEXT_PUBLIC_GATEWAY_URL` to its public gateway URL before building.
