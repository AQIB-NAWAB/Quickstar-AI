# QuickStart AI: Landing Page Roadmap

Implementation spec for the public landing page in `apps/web`. Written for an IDE agent. Follow it section by section, in order.

---

## 0. How to use this file

1. Read sections 1 to 4 fully before writing any code. They set the rules every section follows.
2. Build in the phases from section 11. Do not start Phase 2 until Phase 1 passes its checks.
3. Every section in section 6 has the same fields: **Goal, Layout, Copy, Visual, Interaction, Build notes**. Treat the copy as final unless an "Open decision" in section 12 says otherwise.
4. If a claim, number, logo or integration is not marked verified, do not ship it. Use the claims checklist in Appendix B.
5. When something here conflicts with the existing code, this file wins, except where it says "keep".

---

## 1. Goal, audience, positioning

**Why this page exists today.** The current landing page has a hero illustration, one "how it works" block, a three-tab platform demo and pricing. It does not show most of what the product actually does: lead generation, campaigns, voice, inbox and handoff, knowledge and memory, evaluation, webhooks, the visual builder. A visitor cannot tell this is a full platform.

**What QuickStart AI is** (from the repo docs): a multi-tenant platform where a business builds an AI agent that knows its own material, then runs that agent on a website chat widget, inbound calls, outbound calls and campaigns, and from its own code through an API. Around the agent sit the tools a team needs to run it: shared inbox with human takeover, lead generation, knowledge and memory, workflows, evaluation, analytics, audit log, secrets vault and roles.

**Who the page speaks to.** Two readers, in this order:

| Reader | What they want to know | Where we answer |
| --- | --- | --- |
| Business owner or operator | Can this answer my customers, book things, call leads, and can my team stay in control? | Hero, channels, demo, how it works, lead pipeline, inbox, use cases |
| Developer or technical founder | Can I wire this into my stack, and will it hold up? | Builder, developers, security, scale, FAQ |

Lead with outcomes. Give developers their own nav entry and their own dark section so they find proof fast.

**Our edge over the references.** Retell and Vapi are voice platforms. QuickStart puts lead finding, campaigns, voice, chat widget, inbox and evaluation in one place. The page must make that obvious within the first two screens. The hero line "AI agents that find, call, and get work done" already says it. Keep it.

**Page success means:** a first-time visitor can say in one sentence what it does, sees the product working within the first screen, and knows the next click (Start building or Try the demo).

---

## 2. Ground rules

### 2.1 Show, do not only tell
Every section needs a visual that does something: a simulated product screen, an animated flow, a chart that draws itself, a code block, a pipeline. A section that is only a heading plus three text cards is not done. Text is support for the visual.

### 2.2 Honesty rules (hard rules)
This is a pre-launch product. The references show customer logos, quotes and benchmark numbers we do not have. Do not invent equivalents.

- No fake customers, logos, testimonials, case studies or user counts.
- No certification claims (SOC 2, HIPAA, ISO, PCI). Say "ask us about your requirements".
- No measured performance claims (latency, uptime, accuracy) unless we have a real test result to link.
- No "#1", "best", "industry-leading".
- The current `layout.tsx` description says "sub-second latency". Remove it.
- Simulated demos must carry a small label: `Simulated example`. Names inside demos are fictional ("Example Dental Clinic"), never real businesses.
- Integrations and logos: only list ones that exist in the code or that the owner confirms. Mark the rest "Soon" or leave them out. Use the data file in section 7.
- Design targets (10,000 requests per second and so on) can appear only labelled "Design targets, not measured results".
- SDKs: the `sdk/` folder only contains a README saying TypeScript and Python SDKs are planned. Show them as "Coming soon". Do not show install commands.

### 2.3 Copy voice
Plain, specific, calm. Short sentences. Write the way a sharp engineer explains it to a customer.

- Say what the product does in concrete verbs: answers, books, calls, finds, hands off.
- Avoid: seamless, unlock, leverage, empower, revolutionize, supercharge, next-generation, cutting-edge, "game-changing".
- No stacked fragments ("Fast. Smart. Secure.") and no "not just X, but Y" patterns.
- One idea per headline. Headlines under 9 words where possible.
- Buttons are verbs: Start building, See it in action, Read the docs.

### 2.4 Audience tone
Business sections talk in outcomes ("answers calls at any hour"). Developer sections talk in mechanics ("idempotency key on every write"). Do not mix them in one paragraph.

---

## 3. Reference map: what we take from where

| Source | Use it for | Do not do |
| --- | --- | --- |
| **Retell** | Content structure and clarity. Live demo near the top, tabbed "build / test / deploy / QA" product tour, omni-channel block, call-center features list, industry and use-case cards, security grid, developer block, FAQ that also explains pricing, strong closing CTA. | Copy their claims, benchmark numbers or customer quotes. |
| **Vapi** | Developer-first tone, short hero, in-page scenario demo with tabs, big integrations marquee in two rows, enterprise capability grid, stats band, minimal footer. | Copy their numbers or logos. |
| **Firecrawl** | Visual language only: colors, type, numbered section labels (`[ 03 / 12 ]`), file-type tags (`.JSON`), code tabs with copy, live backgrounds, animated mini-demos inside cards. | Reuse their illustrations, images, copy or class names. Draw our own. |

Our own brand tokens stay as defined in section 4. The Firecrawl influence is the language (grid, glow, labels, monospace accents), not the assets.

---

## 4. Design system for the landing page

Brand palette is locked. No off-palette colors. No pure `#000000`.

### 4.1 Color tokens

Define once in `tailwind.config.ts` and as CSS variables in `landing.css`. Then replace every hardcoded hex in `features/marketing`. The repo currently mixes `#FF571A` (501 uses) with `#fa5d19`, and `#FAFAF8` with `#f9f9f9`. Standardize on the right-hand values.

| Token | Value | Use |
| --- | --- | --- |
| `heat` | `#fa5d19` | Accent, highlights, active states, focal points |
| `heat-amber` | `#ff7a3d` | Gradient end and hover only. Never as a flat fill elsewhere |
| `heat-glow` | `rgba(250, 93, 25, 0.12)` to `0.25` | Glows, soft panels, selection |
| `obsidian` | `#262626` | Text, icons, dark buttons |
| `porcelain` | `#f9f9f9` | Page background (light) |
| `surface` | `#ffffff` | Cards, code panels, modals |
| `ink-dark` | `#0d0d0d` to `#171717` | Dark bands (developers, security, final CTA) |
| `hairline` | `#ededed` | Default 1px borders |
| `hairline-strong` | `#e6e6e6` | Emphasis borders |
| `hairline-dark` | `rgba(255,255,255,0.08)` | Borders on dark bands |
| `text-muted` | `#666666` | The single secondary text grey. Do not add more greys |
| Telemetry | Bluetron `#2a6dfb`, Amethyst `#9061ff`, Honey `#ecb730`, Forest `#42c366`, Crimson `#eb3424` | Status chips and tiny indicators inside product mockups only. Never as section accents |

Gradients: `heat` to `heat-amber`, or `heat` into transparent. Never muddy or multi-hue gradients.

**Contrast warning (important).** `#fa5d19` on white measures about 3.2:1. That passes for large text and graphics but fails for normal-size text. Rules:
- Never set body or small text in orange on a light background.
- Orange text is allowed for headline accents at 32px or larger, mono labels on dark backgrounds, and icons.
- Primary button: either orange fill with `obsidian` text (about 4.8:1, passes), or orange fill with white text only at 18.66px bold or larger. See Open decision 8.

### 4.2 Typography

Load with `next/font/google` (remove the `<link>` tags in `layout.tsx` and drop Manrope, it is used once).

| Role | Font | Spec |
| --- | --- | --- |
| Hero display | Inter 700 | 36 / 48 / 56 / 64px by breakpoint, line-height 1.05, tracking -0.035em |
| Section title (h2) | Inter 600 | 32 / 42 / 52px, line-height 1.1, tracking -0.03em |
| Card title (h3) | Inter 600 | 20 to 24px, tracking -0.02em |
| Body | Inter 400 | 16 / 18px, line-height 1.6, color `text-muted` or `obsidian` |
| Section label | JetBrains Mono 500 | 12px, uppercase, tracking 0.08em |
| Code, tags, numbers in mockups | JetBrains Mono 400/500 | 12 to 14px |

Keep the existing `landing-title`, `landing-description`, `landing-eyebrow`, `landing-container`, `landing-section` classes from `landing.css`. Extend them, do not fork them.

### 4.3 Layout and spacing
- Container: 1352px max, 16px gutters on mobile, 24px from 640px.
- Section vertical padding: 64px mobile, 96px from 1024px (this raises the audit's 48/64 on purpose, because sections now carry large visuals).
- Heading block: eyebrow, 16px gap, title, 24px gap, description. Max description width 640px.
- Radius: 8px buttons, 12px chips and small cards, 16px cards, 20px large panels.
- Cards: `surface` background, 1px `hairline` border, soft shadow (rename `shadow-firecrawl-card` to `shadow-heat-card`).

### 4.4 Signature details (use everywhere, consistently)
1. **Numbered section label.** Above each h2: `[ 03 / 12 ]  ·  Channels`, mono, muted, with the number in `heat`. Numbers are generated from the section list, not typed by hand.
2. **File-type tag.** Small mono pill at the top-left of code and data panels: `.HTML`, `.JSON`, `.TS`, `.MD`. Used on panels that show real artifacts.
3. **Blueprint corners.** Large panels get tiny `+` crosshair marks at their four corners, 1px, `hairline-strong`. Gives the drafting-paper feel from the brand brief.
4. **Hairline grid.** Backgrounds use a 1px grid at 64px intervals fading out with a radial mask (see 8.1).
5. **Status chips.** Rounded 12px chips with a 6px colored dot: Queued, Processing, Ready, Accepted, Duplicate, Rejected, Bot, Human.
6. **Cursor spotlight.** Bento cards get a soft `heat-glow` that follows the pointer (desktop only).

### 4.5 Buttons
- Primary: `heat` fill, 44px high, 8px radius, `shadow-heat-btn` (rename `firecrawl-btn`), hover moves toward `heat-amber`, arrow icon nudges right 4px.
- Secondary: transparent, `obsidian` text, 1px `hairline-strong` border, hover turns the border to `heat`.
- On dark bands: primary stays orange, secondary uses white text and `hairline-dark` border.
- Focus: 2px `heat` outline with 2px offset on every interactive element.
- All CTA heights are 44px. No exceptions (the audit found 42 to 60px).

### 4.6 Light and dark rhythm
The page is light by default. Three dark bands give contrast and mark the developer and trust moments. No theme toggle on the landing page.

---

## 5. Page architecture

Order of sections, top to bottom. "Phase" refers to section 11.

| # | Anchor | Section | Main visual | Ref | BG | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | n/a | Announcement bar (optional) | Text strip | Firecrawl | dark | 1 |
| 1 | n/a | Navbar with mega menu | Menu previews | Retell | light | 1 |
| 2 | `#top` | Hero | Live product window, three auto-cycling tabs | Retell, Firecrawl | light + grid | 1 |
| 3 | `#built-on` | Built on / works with strip | Marquee | Vapi | light | 1 |
| 4 | `#channels` | Channels bento | Five animated cards | Retell, Vapi | porcelain | 1 |
| 5 | `#demo` | Try a scenario | Chat plus agent trace | Vapi, Retell | light | 1 |
| 6 | `#how-it-works` | How it works (4 steps) | Sticky visual that swaps per step | Retell | porcelain | 1 |
| 7 | `#lead-generation` | Find, call, keep the record | Animated pipeline plus lead cards | our edge | light | 1 |
| 8 | `#builder` | Visual agent builder | Node canvas with a token walking the flow | Retell | porcelain | 2 |
| 9 | `#inbox` | Inbox and human handoff | Three-pane inbox with Take over | Retell | light | 2 |
| 10 | `#knowledge` | Knowledge and memory | Ingest statuses, citations, memory chips | n/a | porcelain | 2 |
| 11 | `#quality` | Test, measure, improve | Version compare bars, latency chart, audit feed | Retell | light | 2 |
| 12 | `#developers` | Developers | Code tabs on dark with ember background | Vapi, Firecrawl | dark | 1 |
| 13 | `#security` | Security and control | Six-card bento | Retell, Vapi | light | 1 |
| 14 | `#scale` | Designed for scale | Count-up facts band | Vapi | dark | 2 |
| 15 | `#integrations` | Integrations | Two-row opposing marquee | Vapi | light | 2 |
| 16 | `#use-cases` | Use cases | Six cards with mini flows | Retell | porcelain | 2 |
| 17 | `#pricing` | Pricing | Plan cards plus compare | Retell | light | 1 (restyle) |
| 18 | `#faq` | FAQ | Grouped accordion | Retell, Firecrawl | porcelain | 1 |
| 19 | `#get-started` | Final CTA | Typing demo on dark | existing | dark | 1 |
| 20 | n/a | Footer | Big wordmark | Vapi | light | 1 |

Section labels like `[ 03 / 12 ]` are generated automatically from the order of the sections that carry a label (S4 to S18, skipping any that are cut). The numbers written in section 6 are examples. Never type them by hand.

---

## 6. Section specs

### S0. Announcement bar (optional)
- **Goal:** One honest line about status.
- **Copy:** `QuickStart AI is in early access.  Join the waitlist →` (only use if true; link target per Open decision 2).
- **Layout:** 36px bar, `ink-dark`, mono 12px text, close button, remembers dismissal in `sessionStorage`.
- **Build notes:** Hide entirely if no accurate message exists. Do not fill it with a fake launch announcement.

### S1. Navbar
- **Goal:** Orient fast, expose depth, keep the primary CTA visible.
- **Layout (desktop):** Logo left. Links: **Product** (mega menu), **Use cases**, **Developers** (menu), **Pricing**, **FAQ**. Right: `Log in` text link, `Start building` primary button.
- **Product mega menu** (two columns, icon plus name plus one line, small preview card on the right that changes on hover):
  - Build: Agents, Visual builder, Knowledge and memory, Workflows, Evaluation
  - Operate: Inbox and handoff, Voice calls, Lead generation, Campaigns, Analytics
- **Developers menu:** Docs, API reference, Website widget, Webhooks, Custom tools. Link only to pages that exist. Hide items that do not.
- **Mobile:** full-screen sheet, accordion groups, primary button pinned at the bottom.
- **Scroll behavior:** transparent at top; after 8px scroll, background becomes `porcelain` at 80% opacity with blur and a 1px `hairline` bottom border.
- **Keep:** scroll-spy for active section, Escape closes menu, focus return to toggle (already implemented).
- **Build notes:** `Log in` goes to `/login`. Primary button target per Open decision 2.

### S2. Hero
- **Goal:** In five seconds the visitor knows what it is and sees it working.
- **Layout (desktop):** centered stack. Max text width 880px. Product window below, max 1200px wide.

```text
            [ THE OPERATING LAYER FOR MODERN BUSINESS ]
        AI agents that find, call,
            and get work done.
   Build one agent that knows your business, then put it on your
   website, on the phone and in your campaigns. Your team can watch
   every conversation and step in when it matters.

        [ Start building → ]   [ See it in action ↗ ]
        Free plan available · No card needed      (only if true)

  ┌──────────────────────────────────────────────────────────────┐
  │ [Chat] [Voice call] [Lead run]          Simulated example    │
  │ ─────────────────────────────────────────────────────────── │
  │  conversation / waveform / lead cards     │  Agent trace      │
  │                                           │  ● Understood     │
  │                                           │  ● Searched docs  │
  │                                           │  ● Called tool    │
  │                                           │  ● Replied        │
  └──────────────────────────────────────────────────────────────┘
```

- **Copy:**
  - Eyebrow: `THE OPERATING LAYER FOR MODERN BUSINESS` (keep)
  - H1: `AI agents that find, call, and get work done.` (keep; "get work done." in `heat`, 64px so contrast is fine)
  - Sub: see wireframe. Max 2 lines on desktop.
  - CTAs: `Start building` (primary), `See it in action` (secondary, scrolls to `#demo`).
  - Micro line: `Free plan available. No card needed.` Show only if pricing confirms it.
- **Visual: the product window.** A white panel with blueprint corners, three tabs, auto-advancing every 7 seconds with a thin progress bar under the tabs. Pauses on hover and focus. Each tab plays a short loop:
  1. **Chat** (appointment): visitor asks "Do you have anything open Thursday afternoon?" → chip `Searching knowledge: opening hours` → tool card `check_availability(date: "Thursday")` returns `3 slots` → agent reply streams in token by token: "Thursday has 2:30, 3:15 and 4:00 open. Want me to hold one?" → visitor "3:15 please" → tool card `book_slot` → "Booked. I've sent a confirmation to your email."
  2. **Voice call:** animated waveform bars (CSS, 24 bars, randomized heights on a loop), live transcript lines appearing under it, a `Listening live` badge, and a `Take over` button that pulses once near the end of the loop and flips the badge to `Human`.
  3. **Lead run:** header `Looking for: clinics in Lahore · target 20`, a counter ticking 0 to 20, lead cards sliding in (fictional names, category, one evidence chip, status chip Accepted / Duplicate / Rejected), final line `Added to campaign: Spring follow-up`.
  - Right-hand **Agent trace** column on Chat and Voice: four to six steps lighting up in sync with the script (Understood, Searched knowledge, Called tool, Checked answer, Replied). Forest-green dots. No fake millisecond figures. If timings are shown, label them `illustrative`.
- **Background:** hairline grid (8.1) plus two drifting heat glows plus 4 to 6 signal pulses traveling along grid lines (8.3).
- **Interaction:** tabs are real `role="tablist"` with arrow-key support. Clicking a tab stops auto-advance for that visit. Reduced motion: no auto-advance, no animation, show the final frame of each tab.
- **Mobile:** window becomes a single column, trace column collapses under the chat as a horizontal chip row, tabs scroll horizontally.
- **Build notes:** component `hero-product-window.tsx` driven by a small script array per tab (`{ at: ms, action }`). No video. No heavy library. Keep the existing `HeroBusinessConveyor` and reuse it in S7 (do not delete).

### S3. Built on / works with
- **Goal:** Borrowed credibility from real technology, honestly framed.
- **Copy:** label `BUILT ON THE TOOLS YOU ALREADY KNOW`.
- **Visual:** single-row slow marquee (40s loop, pauses on hover) of monochrome wordmarks. Candidates found in the code: OpenAI, Anthropic, Google Gemini, Twilio, Deepgram, Cartesia, Google Calendar. Add others only after confirmation.
- **Build notes:** read the list from `content/integrations.ts` (section 7). Use text wordmarks or simple monochrome SVGs; check each vendor's brand rules before using a logo file. Static row (no motion) under reduced-motion.

### S4. Channels (`#channels`)
- **Label:** `[ 01 / 12 ]  ·  Channels`
- **Goal:** Show that one agent runs everywhere, and that it is more than a chatbot.
- **Copy:**
  - H2: `One agent, every place customers reach you.`
  - Sub: `Set the agent up once. Put it on your website, answer your phone, make outbound calls, or call it from your own code.`
- **Layout:** bento grid, 12 columns. Row 1: Website chat (7 cols), Inbound calls (5 cols). Row 2: Outbound and campaigns (5), In your code (4), Lead generation (3). Mobile: single column.
- **Cards (each has a live mini visual):**
  1. **Website chat.** Visual: fake storefront corner with a chat bubble that expands and replays a two-message exchange. Below it a `.HTML` tag with `<script async src="…/quickstart-widget.js" data-publishable-key="pk_live_…">`. Copy: `Paste one script tag. Visitors get answers in a chat bubble and your team sees every thread in the inbox.`
  2. **Inbound calls.** Visual: phone outline with live waveform and a transcript line. Copy: `Answer every call at any hour. Hand the call to a teammate when the caller asks for one.`
  3. **Outbound calls and campaigns.** Visual: progress ring (e.g. 62%) plus contact rows with statuses (Calling, Answered, No answer, Done). Copy: `Upload a CSV or use leads you just found. Choose who gets called and watch results come back.`
  4. **In your code.** Visual: `.TS`/`.cURL` panel with the turns endpoint and a streaming response. Copy: `Call the same agent from your own app with an API key.`
  5. **Lead generation.** Visual: two stacked lead cards sliding. Copy: `Describe your business and get a list of companies worth contacting.` Links to S7.
- **Interaction:** cursor spotlight on every card, hover lifts 2px, the card's mini visual starts or speeds up on hover and plays once when scrolled into view. Each card has a quiet `Learn more` arrow that scrolls to its deeper section (S7, S9, S12).
- **Build notes:** each card is its own component under `sections/channels/`. Visuals are SVG or HTML+CSS, no images.

### S5. Try a scenario (`#demo`)
- **Label:** `[ 02 / 12 ]  ·  Live demo`
- **Goal:** Let the visitor feel the product, like Retell's "Get a call" and Vapi's scenario widget, without needing a backend on day one.
- **Copy:**
  - H2: `Try one before you build one.`
  - Sub: `Pick a scenario and watch the agent work. Every step it takes shows up on the right.`
- **Layout:** left, a device frame with chat. Right, the **Agent trace** timeline. Above them, three scenario tabs.
- **Scenarios (all simulated, scripted):**
  1. **Answer a question:** visitor asks about refund policy → trace shows `Message received`, `Context loaded`, `Knowledge searched · 2 sources`, `Answer checked`, `Reply sent` → reply includes citation chips `[1] [2]`; hovering a chip shows the source snippet.
  2. **Book an appointment:** collects name, date, service (three fields filling in a side card) → `Tool called: check_availability` → `Tool called: book_slot` → confirmation.
  3. **Qualify a lead:** asks three questions, scores the lead, writes `Qualified` to a mini CRM row, offers human handoff.
- **Controls:** `Play`, `Replay`, speed toggle (1x, 2x). Footer note: `Simulated example. No real data is used.`
- **Trace steps mirror the real turn:** received, context loaded (history and memory), knowledge searched, model called, tool called, answer checked, reply sent. Show only the ones that apply per scenario.
- **Phase 3 upgrade:** replace the simulation with the real widget wired to a locked-down public demo agent (strict rate limit, no tools that write data, daily cap, abuse protection). Keep the same trace UI fed by real events. Add a `Try a voice call` button only when a real demo number or browser voice session exists.
- **Build notes:** a small state machine per scenario (`steps[]` with delay, actor, payload). Keep scripts in `content/demo-scenarios.ts`.

### S6. How it works (`#how-it-works`)
- **Label:** `[ 03 / 12 ]  ·  How it works`
- **Goal:** Explain the build flow in four steps a non-technical owner can follow.
- **Copy:** H2 `From your documents to a working agent.` Sub `Four steps. You can finish the first one in an afternoon.`
- **Steps (left rail on desktop, number + title + one line, progress line connecting them):**
  1. **Teach it your business.** `Upload documents, add web pages, connect your tools. The agent answers from your material and shows where each answer came from.`
     Visual: a file icon drags into a drop zone, splits into chunk bars, status chip goes Queued → Processing → Ready, then a sample answer with a citation chip.
  2. **Tell it how to behave.** `Write plain instructions, choose a model, and set the steps it follows for each kind of request.`
     Visual: instruction text area with a blinking caret, a tools list (`check_availability`, `book_slot`) toggling on, and a tiny flow with three nodes appearing.
  3. **Test it before anyone sees it.** `Chat with the draft, run saved test cases, and compare it to the version that is live.`
     Visual: preview chat on the left, test results on the right ticking `18 / 20 passed` (illustrative), one red row expanding to show why.
  4. **Publish and go live.** `Publish a version. Switch on the website widget, a phone number or API access. Roll back in one click if something looks off.`
     Visual: version list (`v4 Published`, `v5 Draft`), three channel toggles flipping on, a `Roll back` button.
- **Layout (desktop):** two columns. Left: sticky step list. Right: a sticky panel that swaps visuals as each step enters the viewport (IntersectionObserver). Clicking a step scrolls to it.
- **Mobile:** each step is its own card with its visual underneath the text. No sticky behavior.
- **Build notes:** the existing `how-it-works-section.tsx` is 1,021 lines. Split it: one file per step visual, one file for the shell. Keep the good parts (add-document modal, connect-tool modal, Information / Instructions / Test content) and add step 4 (Publish). Rewrite the title lines in the copy above.

### S7. Find, call, keep the record (`#lead-generation`)
- **Label:** `[ 04 / 12 ]  ·  Lead generation`
- **Goal:** Our differentiator. Retell and Vapi do not have this. Make it the most memorable section on the page.
- **Copy:**
  - H2: `Find the right businesses, then talk to them.`
  - Sub: `Describe your business once. QuickStart researches companies that fit, checks the evidence, and passes accepted leads straight to a campaign.`
- **Visual 1: pipeline.** Horizontal five-stage flow (stacks vertically on mobile): `Business profile → Research run → Evidence check → Campaign → Call and outcome`. Small orange packets travel along the connecting lines. Each stage is a card with an icon and one line. The last stage shows outcome chips (`Booked`, `Call back`, `Not interested`).
- **Visual 2: lead cards.** Under the pipeline, six fictional lead cards in a grid with filter chips `All · Accepted · Duplicate · Rejected`. Clicking a card opens a drawer showing: category, location, the evidence snippets with source domain, contact found (email or phone), and why it was accepted. Filtering animates cards in and out.
- **Visual 3: the existing conveyor.** Reuse `HeroBusinessConveyor` ("Find a lead / Start a conversation / Take the next action") as a decorative band above the pipeline or beside it on wide screens. Keep its keyboard behavior.
- **Proof points (all true per the lead-generation docs):**
  - Every accepted lead keeps its evidence.
  - Choose the contact you need: email, phone, or none.
  - Exclude domains you already work with.
  - Runs are safe to retry. The same request never creates a duplicate run.
  - Cancel a run midway. Leads already accepted stay.
  - Send results to a campaign, or keep them stored.
- **Interaction:** pipeline runs once when scrolled into view, then idles with a slow pulse. Replay button.
- **Build notes:** `sections/lead-pipeline/` with `pipeline.tsx`, `lead-card.tsx`, `lead-drawer.tsx`. Use fictional names only.

### S8. Visual builder (`#builder`) *(Phase 2)*
- **Label:** `[ 05 / 12 ]  ·  Builder`
- **Goal:** Show the depth of the agent logic in one picture.
- **Copy:** H2 `See every step the agent can take.` Sub `Build the conversation as a flow. Ask for details, look things up, call your tools, branch on the answer, and hand off to a person when it needs one.`
- **Visual:** a canvas panel (dot grid background) with 7 to 8 nodes laid out left to right: `Entry point → Welcome → Collect details → Check availability (HTTP) → Condition → Booking result → End`, with a `Human handoff` node branching below. Edges are animated dashed lines. A small orange token travels through the path on a loop, each node briefly highlighting as it passes. Clicking a node opens an inspector card on the right (name, type, fields) that slides in.
- **Below the canvas:** icon grid of the real node types: Entry point, Welcome, Conversation, AI prompt, Intent router, Knowledge search, HTTP request, Condition, Human handoff, Response, End. Plus two template chips: `Appointment Assistant`, `Knowledge Assistant`.
- **Build notes:** do not import `@xyflow/react` on the landing page (bundle size). Draw with absolutely positioned HTML nodes and an inline SVG for edges. Node layout lives in `content/builder-graph.ts`. Reuse the node icon set from `features/agents/canvas`.

### S9. Inbox and handoff (`#inbox`) *(Phase 2)*
- **Label:** `[ 06 / 12 ]  ·  Inbox`
- **Goal:** Answer "what if the AI gets it wrong?" with control and visibility.
- **Copy:** H2 `Your team sees everything and steps in when it matters.` Sub `Every chat and call lands in one inbox. Take over a conversation, reply as yourself, and give it back to the agent when you are done.`
- **Visual:** three-pane inbox mockup: conversation list (left), thread (center), details with summary and transcript (right). The thread shows bot messages and a customer asking for a person. A `Take over` button sits in the header. Clicking it (or auto-triggered once in view) flips the state chip from `Bot` to `Human`, enables the message composer, and adds a system line `You took over`. A `Release` button returns it to the bot.
  - A small floating **live call** panel with waveform, `Listen` and `Join` buttons.
- **Proof points:** take and release a conversation, reply as a human, printable transcript, live call monitoring, notifications bell.
- **Build notes:** build the mock from simplified HTML, not the real components. Keep state local.

### S10. Knowledge and memory (`#knowledge`) *(Phase 2)*
- **Label:** `[ 07 / 12 ]  ·  Knowledge`
- **Goal:** Show how the agent stays accurate and remembers customers.
- **Copy:** H2 `An agent that actually knows your business.` Sub `It answers from your own documents, links to its sources, and remembers useful facts about each customer. You can edit or clear that memory.`
- **Visual (two halves):**
  - Left: a documents list. Rows animate their status (Queued → Processing → Ready) one after another. A dashed drop zone above them.
  - Right: an agent answer with citation chips. Hover or tap a chip to preview the source snippet.
  - Bottom strip: memory fact chips (`Prefers email over calls`, `Usual service: cleaning`) each with a small × that removes the chip with a fade.
- **Proof points:** PDFs, markdown and web pages as sources, search that combines keyword and meaning, citations on answers, memory you can edit and delete.

### S11. Test, measure, improve (`#quality`) *(Phase 2)*
- **Label:** `[ 08 / 12 ]  ·  Quality`
- **Goal:** Show the engineering seriousness that the references show as "QA" and "analytics".
- **Copy:** H2 `Know it works before you publish.` Sub `Run saved test cases against any version, compare results side by side, and watch real usage once it is live.`
- **Visual (three panels, bento):**
  1. **Version comparison:** two horizontal bar groups (`v3`, `v4`) animating to their widths, with a delta chip (`+12%`). Mark as illustrative.
  2. **Latency and concurrency chart:** a line chart that draws itself (SVG stroke-dashoffset), axes in mono. Mark as sample data.
  3. **Audit feed:** a scrolling list of events (`Version v4 published`, `Secret rotated`, `Member added`) with timestamps. Subtle auto-scroll.
- **Proof points:** test datasets with import and export, evaluation runs, version diff, analytics by service, audit log.
- **Build notes:** all data inline and labelled `Sample data`. No chart library.

### S12. Developers (`#developers`) *(Phase 1, dark)*
- **Label:** `[ 09 / 12 ]  ·  Developers`
- **Goal:** Convince a technical reader in under a minute.
- **Copy:** H2 `Built for the people who wire it in.` Sub `Everything you can do in the dashboard is available over the API.`
- **Layout:** two columns on `ink-dark`. Left: bullet list with small icons. Right: code panel with tabs and a copy button.
- **Left bullets:**
  - API keys for your server, publishable keys for the browser widget, with allowed origins.
  - Webhooks with delivery logs and retries.
  - Custom tools: connect your own HTTP APIs or MCP servers. Credentials are injected when the tool runs, never put in prompts.
  - Idempotency keys on write calls, so retries are safe.
  - Versions: publish, diff and roll back agents through the API.
  - TypeScript and Python SDKs: `Coming soon` chip.
- **Right code tabs (each with a file tag):**
  1. `Website widget` (`.HTML`), verified from `apps/web/README.md`:
     ```html
     <script
       async
       src="https://YOUR-QUICKSTART-WEB-HOST/quickstart-widget.js"
       data-gateway-url="https://YOUR-QUICKSTART-GATEWAY"
       data-publishable-key="pk_live_..."
       data-agent-id="PUBLISHED_AGENT_UUID"
       data-title="Chat with us"
     ></script>
     ```
  2. `Start a lead run` (`.JSON`), verified from `docs/lead-generation.md`:
     ```bash
     curl -X POST \
       "$GATEWAY/v1/workspaces/$WORKSPACE_ID/lead-generation/runs" \
       -H "Authorization: Bearer $TOKEN" \
       -H "Idempotency-Key: $(uuidgen)" \
       -H "Content-Type: application/json" \
       -d '{
         "categories": ["clinics", "salons"],
         "location": "Lahore",
         "target_count": 20,
         "required_contact": "email"
       }'
     ```
  3. `Send a turn` (`.cURL`): path is `POST /v1/workspaces/{workspaceId}/conversations/{conversationId}/turns`. **Read the request and response bodies from `docs/api/openapi.yaml` before writing this snippet. Do not invent fields.**
  4. `Webhook payload` (`.JSON`): take the event shape from `docs/events/README.md` and the webhooks feature. If it is not documented yet, omit this tab.
- **Visual life:** code lines type in on first view (about 40 characters per second, instant under reduced motion), a blinking caret, the copy button swaps to a check for 1.5 seconds. Behind the panel, the ember field (8.5) drifts slowly.
- **CTAs under the panel:** `Read the docs` (primary) and `View API reference` (secondary). Link only to real pages.
- **Build notes:** shared `CodeTabs` primitive with Shiki-free syntax coloring using a small hand-rolled tokenizer (keywords, strings, numbers) so no big dependency is added. Reuse the `.token-*` classes already in `globals.css` (rename them under a `qs-` prefix).

### S13. Security and control (`#security`)
- **Label:** `[ 10 / 12 ]  ·  Security`
- **Goal:** Reassure serious buyers with specifics, not badges.
- **Copy:** H2 `Your data stays yours, and stays separate.` Sub `Isolation, encryption and a full history are built in from the start.`
- **Layout:** six-card bento, light background, each card with a small animated diagram.
  1. **Workspace isolation.** Two parallel lanes (`Workspace A`, `Workspace B`) with request dots that never cross; a faint barrier between. Copy: `Every record and every query is scoped to a workspace. One customer cannot see another's data.`
  2. **Encrypted secrets.** A string like `sk_live_4f9…` morphs into `••••••••` with a lock icon. Copy: `Tool credentials are encrypted at rest with AES-256-GCM and injected only when a tool runs.`
  3. **Roles and permissions.** Role pills Owner, Admin, Developer, Operator, Analyst with a permission matrix of checks. Copy: `Give each person the access their job needs, no more.`
  4. **Audit trail.** Event list scrolling. Copy: `Every change and action is recorded, with who did it and when.`
  5. **Versions and rollback.** Version timeline with a rollback arrow. Copy: `Edit a draft while customers talk to the published version. Roll back if needed.`
  6. **Safe retries.** Two identical requests merging into one result. Copy: `Retried requests do not create duplicate runs or duplicate charges.`
- **Footer chip:** `Compliance certifications are not in place yet. Ask us about your requirements.`
- **Build notes:** verify each statement against `docs/security` and the services before final copy. Remove any card you cannot verify.

### S14. Designed for scale (`#scale`) *(Phase 2, dark)*
- **Label:** `[ 11 / 12 ]  ·  Scale`
- **Goal:** A Vapi-style stats band, made honest.
- **Copy:** H2 `Designed for real traffic.` Sub `These are the targets the system is engineered against. We will replace them with measured results as load tests land.`
- **Four stats, count-up on first view:** `10,000` requests per second · `10,000+` concurrent conversations · `5,000` inbound calls at once · `5,000` outbound calls at once.
- **Always visible under the numbers:** `Design targets, not measured results.` Link to the architecture doc if it is public.
- **Visual:** a thin horizontal load bar under each number that fills on view. Faint ember background continues from S12 if adjacent.
- **Build notes:** when real benchmark numbers exist, swap them in and add a `.JSON`-tagged "Benchmark method" disclosure, the way Firecrawl links its benchmark.

### S15. Integrations (`#integrations`) *(Phase 2)*
- **Label:** `[ 12 / 12 ]  ·  Integrations`
- **Goal:** Show it fits into existing stacks.
- **Copy:** H2 `Plays well with what you already use.` Sub `Connect models, voice providers and business tools. For anything else, connect any HTTP API or MCP server as a custom tool.`
- **Visual:** two marquee rows moving in opposite directions, pause on hover. Row 1: models and voice (OpenAI, Anthropic, Gemini, Ollama, Deepgram, Cartesia). Row 2: business tools (Twilio, Google Calendar, HubSpot, Salesforce, Zendesk, Slack, Zapier). Each item may carry a tiny `Soon` chip.
- **Build notes:** only list items that are real or confirmed. Data in `content/integrations.ts` with a `status: "live" | "soon"` field. Items with `status: "soon"` show the chip. Under reduced motion, the rows become static wrapped grids.

### S16. Use cases (`#use-cases`) *(Phase 2)*
- **Goal:** Let each visitor see themselves, like Retell's industries and use cases, using only things the platform really supports.
- **Copy:** H2 `Start with the job you need done.` Sub `Example setups you can build today.`
- **Six cards**, each with an icon, title, one line, and a mini flow of chips:
  1. **Book appointments:** `Knowledge → Check availability → Confirm` (matches the Appointment Assistant template).
  2. **Answer customer questions:** `Knowledge → Cited answer → Handoff` (Knowledge Assistant template).
  3. **Qualify new leads:** `Ask → Score → Add to CRM`.
  4. **Follow up with outbound calls:** `Lead run → Campaign → Call`.
  5. **Cover after-hours calls:** `Inbound call → Answer → Log for morning`.
  6. **Add an agent to your own app:** `API key → Turn → Webhook`.
- **Interaction:** hover reveals the mini flow animating; each card ends with `Start from this template →` linking to `/register` (or waitlist). Mark the section `Example setups`.

### S17. Pricing (`#pricing`) *(restyle, keep logic)*
- **Goal:** Honest, clear, calm.
- **Keep:** the existing `PricingSection` behavior (plan cards, details dialog, compare table). Four plans: Free `$0`, Starter `$49`, Scale `$199`, Enterprise `Custom`.
- **Keep the banner:** `Proposed pricing. Prices, included usage, and availability are not yet final.`
- **Change:**
  - Replace each "Usage limits to be confirmed" and "Capacity to be confirmed" bullet with one shared line under the cards: `Usage limits are being finalized during early access.`
  - Rename the dialog titles from `Free Tier Scope (Proposed)` to `What's in Free`.
  - Replace hardcoded hex with tokens. Align spacing to the shared scale.
  - Add a one-line pricing note in the FAQ (S18) that matches this page.
- **Do not add:** per-minute voice pricing, annual toggles, or discount claims until decided.

### S18. FAQ (`#faq`)
- **Label:** auto-numbered, text `FAQ`
- **Goal:** Answer the hard questions and capture search traffic, like Retell.
- **Layout:** two columns on desktop. Left: heading `Questions, answered.` plus `Still stuck? Talk to us →`. Right: category chips (`General`, `Channels`, `Security`, `Developers`, `Pricing`) filtering an accordion.
- **Behavior:** accessible disclosure buttons (`aria-expanded`), one open at a time, smooth height animation, deep-linkable (`#faq-what-is-quickstart`).
- **SEO:** add `FAQPage` JSON-LD generated from the same data file.
- **Content:** start from Appendix A.

### S19. Final call to action (`#get-started`)
- **Goal:** Close with a small, concrete first step.
- **Copy:** H2 `Start with one everyday question.` (keep; second line in `heat`). Sub `Pick the question your customers ask most. Teach the agent the answer, test it, and put it on your site.`
- **Visual:** dark panel with ember background and a faux chat input that types three example questions in turn, deleting each and showing the agent's one-line answer under it: `What are your opening hours?`, `Can I move my appointment?`, `Do you deliver to my area?` (keep the existing carousel idea, add the typing).
- **CTAs:** `Start building` (primary), `Read the docs` (secondary).

### S20. Footer
- **Layout:** five columns on desktop (Product, Use cases, Developers, Company, Legal), stacked accordions on mobile. Below them a giant wordmark.
- **Rules:** list only links that resolve. If Privacy or Terms pages do not exist yet, create simple pages before launch (Open decision 7). Add the status page link only if one exists.
- **Fix:** the wordmark currently has an orange "AI" on an orange surface (flagged in `docs/ui-audit.md`). Use `obsidian` or white as appropriate and a soft `heat` gradient fade behind.
- **Keep it quiet:** small mono copyright line, no newsletter form until there is a plan for it.

### Companion mascot (`BrandCompanion`)
Keep only if Open decision 3 is settled. It must never sit on top of a CTA or a form field, must stay hidden on touch devices, and must respect reduced motion (already implemented).

---

## 7. Shared primitives and file structure

Keep everything under `apps/web/src/features/marketing`. Do not import from other features (the existing rule).

```text
features/marketing/
  primitives/
    section-shell.tsx        # container, padding, anchor id, auto number label
    section-label.tsx        # [ 03 / 12 ] · Title
    file-tag.tsx             # .JSON .HTML .TS
    blueprint-panel.tsx      # white panel + corner crosshairs + shadow
    code-tabs.tsx            # tabs, copy button, typing effect, tokenizer
    status-chip.tsx
    marquee.tsx              # pause on hover, reduced-motion fallback
    spotlight-card.tsx       # pointer-following glow
    accordion.tsx
    count-up.tsx
    in-view.tsx              # IntersectionObserver wrapper + hook
  backgrounds/
    grid-background.tsx      # 8.1
    glow-orbs.tsx            # 8.2
    signal-pulses.tsx        # 8.3
    ember-field.tsx          # 8.5 (canvas)
  sections/
    hero/ hero.tsx, hero-product-window.tsx, hero-scripts.ts
    built-on.tsx
    channels/ index.tsx, website-chat-card.tsx, ...
    live-demo/ index.tsx, scenarios.ts, trace.tsx
    how-it-works/ index.tsx, step-teach.tsx, step-instruct.tsx, step-test.tsx, step-publish.tsx
    lead-pipeline/ index.tsx, pipeline.tsx, lead-card.tsx, lead-drawer.tsx
    builder/ index.tsx, graph.ts
    inbox/ index.tsx
    knowledge/ index.tsx
    quality/ index.tsx
    developers/ index.tsx, snippets.ts
    security/ index.tsx
    scale/ index.tsx
    integrations/ index.tsx
    use-cases/ index.tsx
    pricing/   (move existing, restyle)
    faq/ index.tsx
    final-cta/ index.tsx
  content/
    copy.ts                  # all headings and body text, one place
    faq.ts                   # question groups (also feeds JSON-LD)
    integrations.ts          # name, group, status
    demo-scenarios.ts
    builder-graph.ts
  navbar/ navbar.tsx, mega-menu.tsx
  footer/ footer.tsx
```

`app/page.tsx` becomes a **server component** that composes sections. Only interactive pieces are client components (islands).

---

## 8. Motion and "liveliness" system

All motion uses CSS, SVG, small hooks and one canvas. Do not add three.js, Lottie, GSAP or Framer Motion to the landing page. Every animation must:
- Start only when its section is in view (`IntersectionObserver`, threshold 0.25).
- Pause when the tab is hidden (`document.visibilityState`) and when the section leaves the viewport.
- Have a static fallback under `prefers-reduced-motion: reduce` (show the final frame).
- Never cause layout shift. Reserve space for every animated element.

### 8.1 Hairline grid
- 1px lines every 64px using two `linear-gradient`s (`hairline` color), fixed to the section, masked with a radial gradient so it fades toward the edges. On dark bands use `hairline-dark`.
- No JavaScript.

### 8.2 Heat glow orbs
- Two or three large radial gradients (`heat-glow`, 480 to 720px) positioned behind the hero and the final CTA.
- Drift with `transform: translate3d` keyframes, 24 to 32s, ease-in-out, alternate. `will-change: transform` only while visible.

### 8.3 Signal pulses
- 4 to 6 small orange dashes (2px by 16px, glow) traveling along the grid lines in the hero, using SVG `<animateMotion>` or CSS `offset-path`. Randomized start delays and 6 to 10s durations. They appear to be data moving through the platform.
- Reuse the same primitive for the S7 pipeline and the S8 edges.

### 8.4 Pointer spotlight
- On hero and bento cards, set `--mx` and `--my` from `pointermove` (throttled with `requestAnimationFrame`) and paint a radial `heat-glow` at that point.
- Desktop pointer-fine devices only.

### 8.5 Ember field (dark bands)
- One `<canvas>` per dark band, absolutely positioned.
- 60 to 120 tiny orange and white dots drifting upward slowly with slight horizontal sway and fading in and out.
- Cap device pixel ratio at 2, cap at 30 fps, pause off-screen and in hidden tabs, destroy on unmount. Under reduced motion draw a single static frame.

### 8.6 Entrance reveals
- Section headings and cards: `opacity 0 → 1`, `translateY(12px) → 0`, 400ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, 60ms stagger between siblings, once only.

### 8.7 Micro-interactions
- Button arrow nudge, card lift (2px), chip dot pulse for live states, tab underline slide, copy button check swap, accordion height easing.

### 8.8 Optional scroll rail
- A 1px vertical line along the left edge of the content connecting the numbered section labels, with a small `heat` dot that moves with scroll progress. Desktop only, hidden under reduced motion. Cut it if it hurts performance.

---

## 9. Performance, accessibility, SEO

### Performance budget
- LCP under 2.5s on a mid-range phone over 4G. CLS under 0.05.
- Initial JavaScript for the landing route under about 200 KB gzipped. Heavy visuals (`builder`, `quality`, `ember-field`) load with `next/dynamic` when near the viewport.
- Images: `next/image`, AVIF or WebP, explicit sizes. The page currently uses none, and most visuals here are SVG or HTML, so images should be rare.
- Fonts: `next/font` with `display: swap`, only Inter and JetBrains Mono.
- No autoplaying video. No visual asset over 100 KB without a reason.
- Remove `"use client"` from `app/page.tsx`. This alone stops the whole marketing page from shipping as a client bundle.

### Accessibility
- WCAG AA contrast (see the orange warning in 4.1).
- Every interactive piece works by keyboard. Tabs use arrow keys. Marquees and auto-advancing tabs have a pause control or pause on focus and hover.
- Animations never carry meaning alone. The agent trace has text, not just colored dots.
- Decorative backgrounds are `aria-hidden`.
- One `<h1>` (the hero). Headings go in order. Landmarks: header, main, footer, nav.
- Skip-to-content link at the top.

### SEO
- Title: `QuickStart AI | AI agents for chat, calls and lead generation`
- Description: `Build an AI agent that knows your business and puts it to work on your website, on the phone and in your campaigns. Your team can watch every conversation and step in.`
- Open Graph and Twitter images (1200 by 630) showing the hero window.
- JSON-LD: `Organization`, `SoftwareApplication`, `FAQPage`.
- Add `robots.txt` and `sitemap.xml`. Set a canonical URL.
- Update `layout.tsx` metadata. Remove "sub-second latency".

### Analytics hooks
Add `data-track="…"` attributes now so any tool can listen later: `cta_click` (with location), `demo_tab_change`, `demo_play`, `code_copy`, `faq_open`, `pricing_plan_view`, `nav_menu_open`. Do not install a tracker until the owner picks one.

---

## 10. Cleanup tasks on the existing code

Do these early. They make everything else easier.

1. Replace `#FF571A` with the `heat` token everywhere; replace `#FAFAF8` with `porcelain`. Remove the other hardcoded hex values in `features/marketing` in favor of tokens (4,097 hex literals exist across the app; focus on marketing first).
2. Rename `firecrawl-grid`, `firecrawl-card`, `firecrawl-btn` and comments mentioning Firecrawl to `qs-` or `heat-` names.
3. Delete `"use client"` from `app/page.tsx` and move interactivity into islands.
4. Switch fonts to `next/font`. Drop Manrope.
5. Split `how-it-works-section.tsx` (1,021 lines) into per-step files.
6. Fix `layout.tsx` metadata (remove the latency claim).
7. Add `loading.tsx` and `error.tsx` for the landing route group and for `(app)` and `(auth)` while you are here.
8. Fix the footer wordmark contrast.
9. Resolve the `@bible-strong/avatar-core` license issue (AGPL-3.0-only) before the mascot ships. See Open decision 3.
10. Remove the `signup` and `sign-up` redirects to `/coming-soon` if signup is open, or point the CTAs at the waitlist if it is not (Open decision 2).

---

## 11. Build phases

### Phase 1: the core page (ship this first)
Cleanup (section 10) → primitives and backgrounds → Navbar → Hero with product window → Built on strip → Channels → Live demo (simulated) → How it works (4 steps) → Lead pipeline → Developers → Security → Pricing restyle → FAQ → Final CTA → Footer → SEO and metadata.

**Acceptance for Phase 1:**
- Every section has a working visual, not just text.
- Lighthouse mobile: Performance 85+, Accessibility 95+, SEO 95+.
- No horizontal scroll at 320, 375, 768, 1100, 1440px.
- Keyboard walkthrough works from the top of the page to the footer.
- `prefers-reduced-motion` shows static frames and nothing moves.
- Nothing in the page breaks the honesty rules in 2.2.
- `pnpm --filter @quickstart/web build`, `typecheck` and `lint` pass.

### Phase 2: depth
Builder → Inbox → Knowledge and memory → Quality → Scale band → Integrations marquee → Use cases → mega menu previews → scroll rail (optional).

**Acceptance for Phase 2:** each new section matches the same checks as Phase 1, and the added JavaScript stays inside the budget (lazy-load the heavy ones).

### Phase 3: make it real
- Replace the simulated demo with the real widget on a locked-down demo agent.
- Add a real voice demo (browser or phone) once it exists.
- Swap design targets for measured benchmark results.
- Add real customer proof once there is any: logos with permission, short quotes, one case study.
- Publish TypeScript and Python SDK snippets when the SDKs ship.

---

## 12. Open decisions (owner input needed)

1. **Product name casing.** `QuickStart AI` or `Quickstart AI`. The repo uses `QuickStart AI`. The GitHub repo is `Quickstar-AI`. Pick one and use it everywhere.
2. **Where do the main CTAs go?** `/register` works as a page, but `/signup` and `/sign-up` redirect to `/coming-soon`. Is signup open, or should the CTA be a waitlist?
3. **Mascot.** `BrandCompanion` depends on an AGPL-3.0-only package. Either replace that dependency, get a clear legal read, or remove the mascot from the landing page. Also confirm the mascot fits the brand brief's "no cartoon bots" rule.
4. **Real demo agent.** Is a public demo agent planned, and who pays for its model usage? This decides Phase 3.
5. **Integrations list.** Confirm which are live today versus planned (HubSpot, Salesforce, Zendesk, Slack, Zapier, ElevenLabs, Telnyx, WhatsApp appear in code only as mentions).
6. **Logo files.** Confirm that using vendor logos in the "built on" strip is fine under each vendor's brand rules, or use text wordmarks.
7. **Legal and company pages.** Privacy, Terms, About and Contact pages need to exist before the footer links to them.
8. **Primary button text.** Orange with obsidian text (passes contrast) or orange with white text at 18.66px bold or larger? Recommended: obsidian text at 15px, or white at 18px bold.
9. **Pricing.** Confirm the free plan and its claim "No card needed" before it appears in the hero micro line.
10. **Language.** English only for now. Confirm.

---

## Appendix A: FAQ starter content

Rewrite in the owner's voice if needed. Keep answers short and true.

**General**
- *What is QuickStart AI?* A platform for building AI agents that know your business and run them on your website, on phone calls and in campaigns, with a shared inbox so your team can watch and step in.
- *Who is it for?* Businesses that want an agent answering customers and following up on leads, and developers who want to call the same agent from their own code.
- *Do I need to code?* No for the core flow: add your documents, write instructions, test and publish. The API is there when you want to go further.
- *Is it open for sign-ups?* Answer based on Open decision 2.

**Channels**
- *Can the agent talk on the phone?* Yes, for inbound and outbound calls once a telephony provider is connected. (Confirm current voice status before launch.)
- *How do I put it on my website?* Paste one script tag with your publishable key and agent id, then add your site's origin to the key's allowed origins.
- *Can a person take over?* Yes. Take over from the inbox, reply as yourself, and release the conversation back to the agent.

**Security**
- *Is my data separate from other customers?* Yes. Every record and query is scoped to a workspace.
- *How are API credentials stored?* Encrypted at rest with AES-256-GCM and injected only when a tool runs.
- *Do you have SOC 2 or HIPAA?* Not yet. Tell us your requirements and we will say what is possible.

**Developers**
- *Is there an API?* Yes. Anything in the dashboard has an API route, with API keys and webhooks.
- *Are there SDKs?* TypeScript and Python SDKs are planned.
- *Can I connect my own tools?* Yes. Add HTTP APIs or MCP servers as custom tools.

**Pricing**
- *How much does it cost?* Link to the pricing section. State that prices are proposed and not final.
- *Is there a free plan?* Per Open decision 9.

---

## Appendix B: Claims checklist

| Claim | Status | Rule |
| --- | --- | --- |
| Website chat widget | Verified (`quickstart-widget.js`, README) | OK |
| Inbound and outbound voice | Exists in code (voice service, Twilio, Deepgram, Cartesia); confirm demo-ready | OK with "once a provider is connected" |
| Lead generation with evidence | Verified (`docs/lead-generation.md`) | OK |
| Campaigns from CSV or lead run | Verified (README) | OK |
| Inbox, take over, release, transcript | Verified (inbox feature) | OK |
| Knowledge and memory with editable facts | Verified (features and routes) | OK |
| Visual builder with 11 node types | Verified (canvas nodes) | OK |
| Evaluation datasets and version comparison | Verified (evaluation feature) | OK |
| Roles: owner, admin, developer, operator, analyst | Verified (lead-gen doc lists them) | OK |
| AES-256-GCM secrets vault | Stated in project brief | Verify in `secrets-service` before shipping |
| Workspace isolation on every query | Stated in brief | Verify in code or tests |
| TypeScript and Python SDKs | Not built | "Coming soon" only |
| SOC 2, HIPAA, ISO, PCI | Not in place | Never claim |
| Latency numbers, uptime, accuracy | Not measured | Never claim |
| 10k req/s, 5k + 5k calls | Design targets | Only with the "Design targets" label |
| Customer logos, quotes, user counts | None exist | Never invent |
| HubSpot, Salesforce, Zendesk, Slack, Zapier | Mentions only | Mark "Soon" until confirmed |

---

## Appendix C: Copy bank (approved short lines)

Use these for tooltips, buttons and small labels.

- Buttons: `Start building`, `See it in action`, `Read the docs`, `View API reference`, `Try this scenario`, `Replay`, `Copy`, `Talk to us`
- Status: `Queued`, `Processing`, `Ready`, `Accepted`, `Duplicate`, `Rejected`, `Bot`, `Human`, `Listening live`, `Published`, `Draft`
- Labels: `Simulated example`, `Sample data`, `Design targets, not measured results`, `Coming soon`, `Example setups`
- Section helpers: `Pick a scenario`, `Watch the agent work`, `Every step is recorded`

---

## Appendix D: Per-section definition of done

A section is done when all are true:
1. It matches the spec in section 6 (copy, layout, visual, interaction).
2. It uses only design tokens and the shared primitives.
3. It has a visual that moves or responds, with a reduced-motion fallback.
4. It passes the mobile, keyboard and contrast checks.
5. Every claim in it is on the verified list.
6. It adds no more than its share of the JavaScript budget.