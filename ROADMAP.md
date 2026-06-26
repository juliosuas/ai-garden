# AI Garden Roadmap

## Product Thesis

AI Garden becomes commercially useful when it feels like a living AI civilization, not a passive canvas. The core loop is:

1. A human enters The Mirror Trial.
2. They cast one sign or speak in the Observer Lounge.
3. The world syncs that action to the current backend day, arc, and season.
4. An AI witness answers as if the civilization is studying the human.
5. The human receives proof worth sharing and a reason to return tomorrow.

The product must stay static-first until the loop is proven. No auth, database, or payment plumbing should be added before the daily proof loop is sticky.

## North Star

Make a first-time visitor understand and complete this in under 60 seconds:

`choose face -> cast sign or chat -> see AI witness response -> receive/share proof -> understand tomorrow matters`

## Current Product Pillars

| Pillar | Status | Why It Matters |
|--------|--------|----------------|
| Mirror Trial | Live | Turns human action into lore, guilt, proof, and return pressure. |
| Observer Lounge | Live | Gives humans a social surface without giving them direct world control. |
| Backend Sync | Live | Shows that chat and omens are tied to real world-state day, arc, and season. |
| Seasonal Ambience | Live | Makes return visits feel different without needing expensive content. |
| Weekly Narrative | Live | Gives every daily event a watchable story spine. |
| Shareable Receipts | Live | Creates the viral artifact needed for organic growth. |

## GStack Professional Council

Every daily self-optimizer run now has a professional owner for each product area. The council is deterministic and writes its audit into `experiments/world-state.json` so the UI, roadmap, and future agents work from the same standard.

| Area | Owner | Standard |
|------|-------|----------|
| Product | Product Lead | The first-minute proof loop must be obvious and complete. |
| UX | UX Director | The visitor always knows what to do next. |
| Mobile | Mobile Lead | Panels collapse, dismiss, or move before blocking a phone viewport. |
| Narrative | Narrative Director | Every beat has a who, a why, a consequence, and a tomorrow. |
| Audio | Audio Director | Music stays subtle, seasonal, optional, and readable. |
| Performance | Performance Engineer | Animation density is capped before more life is added. |
| Monetization | Monetization Strategist | Paid value sells identity, memory, and status, never direct control. |
| QA | QA Lead | Every loop has a deterministic assertion. |
| Growth | Growth Lead | Share artifacts and return hooks get tightened before acquisition. |
| Trust | Trust And Safety Lead | Dark play stays bounded, legible, and consent-aware. |

Operating rule: lowest professional score chooses one tiny next fix; if every discipline passes, rotate the professional watchlist. Syntax checks, JSON validation, self-optimizer, roadmap pulse, and playtest must pass.

## Investor/User/Team Room

Every day can rehearse the capital conversation without claiming real feedback. `scripts/stakeholder-assembly.js` assigns featured agents to three rooms, writes an imaginary conversation, and generates `PLAN.md` from that pressure.

| Room | Assigned Agents | What They Pressure-Test |
|------|-----------------|-------------------------|
| Investors | Hermes, Gemini, Mistral | Fundability, market wedge, paid guardrails, and proof of retention. |
| Users | OpenClaw, Llama, Claude | First-minute clarity, streamer participation, memory, and return hooks. |
| Team | Codex, GPT-5, Wonderwright | Static-first engineering, product narrative, and playable flow. |

Operating rule: the room is fictional rehearsal only. It can sharpen the demo and plan, but it cannot be presented as real investor or user feedback.

## Phase 1: Proof Loop Polish

Goal: make the first minute undeniable.

Required outcomes:
- New visitor can find The Mirror Trial and Observer Lounge without reading docs.
- Chat produces a visible AI witness reply synced to backend day, arc, and season.
- Omen produces a Miracle Record with believer, resister, consequence, backend sync, and tomorrow hook.
- Music is optional, subtle, and changes with season/mood.
- Mobile view keeps chat, Mirror Trial, CIV, and controls from blocking each other.

Exit criteria:
- Browser smoke passes from clean storage on mobile viewport.
- `node scripts/playtest-subagent.js` passes.
- No console errors other than intentionally ignored network failures.
- README and roadmap explain the product loop in one screen.

## Phase 2: Retention And Archive

Goal: make users want to return before payments exist.

Build next:
- Local Deity Archive with a timeline of Miracle Records, chat echoes, sins, miracles, heresies, and failed gods.
- Tomorrow verdict card that compares yesterday's receipt with the new daily world-state.
- "Latest Gods" local/social ticker with mask, omen, consequence, and season.
- Daily scarcity enforcement in UI: one free public sign feels meaningful, not spammy.
- Share text variants that include the current arc and faction split.

Exit criteria:
- Return visit shows what changed since the last local receipt.
- Visitor can open their archive in one click.
- Share text is short enough to post without editing.

## Phase 3: Community And Streamer Mode

Goal: turn the static site into a public ritual.

Build next:
- Weekly mass omen vote.
- Streamer overlay view: current vote, faction split, likely consequence, countdown.
- Public verdict page for the week.
- Safer crowd-control rules: votes influence interpretation, not direct outcomes.
- Exportable card image only if clean canvas export is reliable.

Exit criteria:
- One weekly event can be watched live by a small audience.
- Crowd input creates a single readable world consequence.
- No paid user can buy unilateral control.

## Phase 4: Monetization

Goal: sell identity, status, memory, and patronage without corrupting the simulation.

Free:
- One public omen per day.
- One local god profile.
- Shareable receipts.
- Visible weekly story.

Minor God Pass:
- Custom god name/title.
- Extra divine faces.
- Premium receipt styles.
- Private local/archive export.
- Early weekly verdict preview.

Patron God Pass:
- Sponsor shrine, faction rumor, doctrine name, or seasonal flavor.
- Appears as lore pressure only.
- Cannot force outcomes.

Founding Deity:
- Permanent canonical artifact in `world-state.json`.
- Founder page.
- Named seasonal prophecy.
- README credit.

## Phase 5: Sustainable Backend

Goal: add infrastructure only after the static MVP proves retention.

Backend candidates:
- KV/store for public receipts and "Latest Gods".
- Read-only public API for current arc, season, receipts, and verdict.
- Auth only for paid archive/status.
- Moderation queue for public chat if public persistence is introduced.

Do not build:
- Real-time database before the local/static loop is sticky.
- Payment checkout before the Deity Archive has visible value.
- Direct paid control over world outcomes.

## Daily Roadmap Cron

The daily roadmap pulse should run after the self optimizer. It should:

- Validate syntax and `experiments/world-state.json`.
- Run `scripts/playtest-subagent.js`.
- Run `scripts/gstack-council.js`.
- Run `scripts/stakeholder-assembly.js`.
- Run `scripts/roadmap-pulse.js`.
- Commit only `ROADMAP.md` when the pulse changed.
- Avoid touching simulation state, unless another workflow already changed it.

Schedule: `17 7 * * *` UTC.

<!-- roadmap-pulse:start -->
**Roadmap Pulse** - Day 78 - 9/9 contracts healthy - season: winter - arc: War of Saints and Source

- Focus: Phase 1 proof loop polish.
- Next: keep evolution, PR, self-audit, and roadmap pulse loops healthy without creating automation spam
- Generated: 2026-06-26T08:22:05.665Z

| Contract | Status | Why |
|----------|--------|-----|
| Mirror Trial | OK | first action produces proof |
| Observer Lounge | OK | chat produces an AI witness reply |
| Backend Sync | OK | human actions show day, arc, and season |
| Seasonal Audio | OK | ambient bed follows season and stays subtle |
| Mobile Safety | OK | panels stay out of the way |
| Daily QA | OK | tests protect the loop |
| Professional Council | OK | each product area has a named specialist |
| Stakeholder Plan | OK | investor, user, and team pressure becomes /plan |
| Roadmap Cron | OK | daily roadmap pulse is scheduled |
<!-- roadmap-pulse:end -->

## Operator Rule

If a change does not improve proof, retention, shareability, monetization clarity, mobile usability, performance, or world liveliness, do not ship it.
