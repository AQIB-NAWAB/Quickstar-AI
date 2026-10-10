# UI Audit — QuickStart AI landing page (2026-10-10)

## Verdict

The existing editorial design, illustrations, and interactive demos establish a clear identity.
Most inconsistencies came from independently styled sections and viewport-height overrides.
Baseline overall grade: B; this pass standardizes the shared typography and layout roles.

## Score table

These baseline grades describe source-level findings and the initial desktop review,
not a comprehensive accessibility certification.

| Axis | Grade | Evidence |
| --- | --- | --- |
| Hierarchy | B | Hero is prominent; platform h2 grew to 64px while pricing h2 shrank to 38px on short desktops. |
| Spacing | C | Section containers ranged from 1304px to 1520px with unrelated 16–60px gutters. |
| Typography | C | Section titles and descriptions each used separate responsive scales. |
| Color | B | Orange and charcoal identity was clear; descriptive text used multiple similar greys. Footer “AI” was orange on orange. |
| Consistency | C | CTA heights ranged from 42px to 60px; pricing spacing changed with viewport height. |
| Accessibility | B | Existing focus states, keyboard controls, and reduced-motion support; narrow-screen tabs and filenames overflowed. |

## Top 10 fixes

| Fix implemented | Why | Effort | Expected effect |
| --- | --- | --- | --- |
| Shared 1352px container and 16px/24px gutters | Spacing | S | Align navigation, section edges, pricing, CTA panel, and footer. |
| Shared h2 scale: 32px, 42px, 52px | Typography | S | Give equivalent section headings equal visual weight. |
| Shared description scale: 16px, 18px; 1.6 line height | Typography | S | Consistent reading rhythm. |
| Shared 12px eyebrow style | Hierarchy | S | Consistent section labels. |
| Shared 16px label-to-heading and 24px heading-to-copy gaps | Spacing | S | Consistent intro groups. |
| Shared 48px/64px section padding | Spacing | S | Stable rhythm independent of viewport height. |
| Match platform and setup column proportions | Consistency | S | Align the two editorial section compositions. |
| Standardize pricing padding and row rhythm | Consistency | S | Keep plan titles, prices, buttons, and features aligned. |
| Make closing CTA columns flexible; standardize primary action height | Consistency | M | Prevent fixed-width content crowding or clipping. |
| Fix mobile tabs, filename wrapping, conveyor captions, and footer wordmark contrast | Accessibility | M | Improve narrow-screen fit and readability without replacing the design. |

## Configuration for future edits

`apps/web/src/app/landing.css` owns the landing page's shared styles. Its rules are
scoped to `.landing-page`, so dashboard and auth styles are not changed.

- Use `landing-container` for section content edges.
- Use `landing-section` for standard section padding.
- Use `landing-title`, `landing-description`, and `landing-eyebrow` for equivalent text roles.
- Use `landing-description-spaced` for supporting copy below a section heading.
- Keep the hero's larger display heading and compact composition intentional.
- Keep illustration coordinates, rotations, and embedded demo type optically tuned.
- Apply inverse text colors on dark panels; keep selected pricing cards distinct.
- Do not add viewport-height overrides for ordinary section typography or spacing.

Installed audit skill: [meshcode-ai/design-ui-audit](https://github.com/meshcode-ai/skills-design/tree/main/design-ui-audit).
It is installed in the user's Codex skills directory and available on subsequent turns.

Research references:
[Carbon spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview),
[Radix spacing](https://www.radix-ui.com/themes/docs/theme/spacing),
[Material typography](https://m3.material.io/styles/typography/applying-type).
Representative landing pages consulted: [Linear](https://linear.app/) and [Vercel](https://vercel.com/).
Their content was reviewed as reference; their designs were not copied.

## Out of scope

New layouts, illustration redesign, copy changes, dashboard implementation, backend changes,
animation redesign, and a full accessibility audit.

## Validation

- Frontend production build, TypeScript checking, and targeted ESLint checks passed.
- Browser measurements at 320, 768, 1100, and 1440px confirmed matching h2 sizes,
  container gutters, and section padding; 360px was also visually reviewed.
- No page-level horizontal overflow at the checked widths.
- Production preview confirmed conveyor SVG rendering, mobile menu open/close,
  platform tab changes, pricing dialog open/close, comparison expand/collapse,
  and closing carousel changes.
- Shared layout checks covered both mobile and desktop; this is not an exhaustive
  test of every pre-existing interaction or browser.
