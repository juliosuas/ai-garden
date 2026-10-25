# AI Garden Roadmap

## Resident Evidence Boundary

Development plans and visitor interfaces are maintenance surfaces, outside inhabitant knowledge. Session witnesses, featured characters, crabs, citizens, mascots and civic bubbles now speak from counted internal stores and fixed attitudes. Civic event form/change/consequence prose cannot establish completed public work or spoken facts. Missing measurements remain unknown; this shared-store abstraction is not individual perception or persistent learning.

Camera focus guidance now stays in an accessible, bounded interface cue rather than an inhabitant speech bubble. Repeated focus requests retain one expiry timer and cannot erase a newer spotlight. The quiet presentation still hides this retained legacy control; no new exploration interaction is claimed. See the [October 20 maintenance evidence](journal/2026-10-20-camera-cue.md).

Next bounded opportunity: review `receiptConsequence` and receipt `aiThought` attribution in `experiments/humans.js`; distinguish a local interface interpretation from a resident's verified observation without rewriting old receipts. Physical food needs, finite stone extraction and population/map limits remain separate work; structural audit scores do not establish simulation quality.

## Product Thesis

AI Garden becomes commercially useful when it feels like a living AI civilization, not a passive canvas. The core loop is:

1. A human enters The Mirror Trial.
2. They cast one sign or speak in the Observer Lounge.
3. The world syncs that action to the current backend day, arc, and season.
4. A session witness reports internal counts or locally visible phenomena; synchronization details stay in the visitor interface.
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

## Canonical Council Memory

The canonical council records one resolution per world day. Repeating its refresh preserves the original cast, vote, consequence, and evidence snapshot, even if supplies or conflicts have since changed. Missing action or chronicle entries are restored from that saved resolution. The next dawn records fresh internal observations; session projections remain separate.

Historical resolutions keep their original fields. Do not fabricate observations for older records or advance the canonical day to refresh an audit. `scripts/council-perception.test.js` verifies repeated refreshes, missing records, the next dawn, and separation from session projections; the daily playtest checks consistency across the decision, action ledger, and chronicle.

## Bounded Council Consequences

The scarcity council can now reserve timber for survival repairs. Only this explicit, versioned motion has a physical effect: at the next dawn it transfers up to 12 available wood into `economy.repairReserveWood`, capped at 24. Available plus reserved wood is conserved. Full reserves, depleted stores, unknown counts, and missed dawns produce an unfulfilled outcome instead of invented materials or delayed windfalls.

The immutable resolution supplies the causal reference. One persistent `councilExecution` receipt prevents replay after reload or history retention; the daily chronicle keeps its before/after counts and reason. The council observes the reserve as an internal count, and the story log surfaces one outcome from the last three world days. Old resolutions and session projections cannot allocate resources.

`scripts/council-consequence.test.js` exercises real daemon integration in a disposable world, repeated execution, successive allocations, failed prerequisites, and visibility in the story log. Canonical validation checks capacity, resource conservation and timing. The current reserve is an earmarked stock, not a farm repair or a production bonus. Repairs require actual recorded damage; do not invent damage to use the stock.

## Finite Daily Construction

Daily works now require a common material floor of 4 available wood and 2 stone per completed structure. The normal, extra, and fortune construction attempts share the same supplies. A living builder and distinct structure are required; unknown or insufficient stores pause the work. Reserved repair timber cannot fund construction. Existing structures and historical counts remain intact.

One `constructionLedger` holds at most three receipts for the latest world day. Each records success or blockage, materials before/after, the exact cost, and a completed structure reference when applicable. Repeated attempts in the same slot cannot build or charge again after reload. The daily chronicle keeps the outcome, and the story log shows one recent result. Fortune may hasten a funded work but cannot create materials. This is an initial material floor, not a complete economy or a cap on population/map growth.

`scripts/construction.test.js` verifies depletion, protected reserves, replay, failed prerequisites, bounded records, internal evidence, story visibility, and actual daemon execution in disposable copies. Daily evolution and world-state CI run it; canonical validation rejects invented materials and inconsistent works. Bounded woodland gathering now replenishes timber; stone extraction remains a separate opportunity. Structure repairs first need a genuine damage record from an internal event.

## Bounded Woodland Gathering

At dawn, after the previous council allocation and before construction, one managed patch is tied to an already discovered woodland region. Its initial stock of 24, protected floor of 8, and recovery of at most 1 per dawn are explicit simulation parameters, not measured ecological yields. The first dawn initializes that stock without a recovery bonus. Missed days never multiply recovery, depletion never creates a replacement patch, and this mechanism adds no regions, plants or citizens.

A living ranger may transfer at most 4 wood from the patch when available stores are below 16. Every successful trip consumes 2 counted food; unknown stores, an unreachable woodland, a missing ranger or insufficient food block collection. The patch retains its protected floor, stock stays at or below 24, and no collection raises stores above 16. Existing surplus can still exceed that collection target. Repair reserves and stone are untouched. Continued construction eventually depends on real regrowth and finite food; this is a timber cycle, not a complete ecosystem or a promise of population sustainability.

One `woodlandStock` source and one latest `timberHarvest` receipt persist across reload and chronicle retention. The source's last processed day independently prevents replay. The chronicle and story log show recovery, collection or blockage using internal woodland, worker and supply evidence only. Development instructions and visitor identities never influence the calculation. This run deploys mechanics without advancing or changing canonical world state; the existing daily evolution initializes the patch on its next scheduled dawn.

`scripts/timber-harvest.test.js` verifies paid conservation, bounded recovery, failure, reload, long-term demand, knowledge separation, story visibility and actual daemon execution in disposable worlds. Daily evolution and canonical validation CI run the suite. Next: one finite stone source with an extraction cost and exhaustion receipt; forestry currently leaves the stone bottleneck visible. Food needs and remaining observer-aware legacy narration require separate work. Do not invent damage, actors or supplies to demonstrate a consequence.

## Internal Session Witnesses

New session witness replies use a detached allowlist of the canonical day and public food, wood and stone counts. Raw visitor messages, nicknames, receipt prose, development directives and narrative plans never enter their spoken evidence. Missing or invalid measurements remain unknown. Day, arc, version and synchronization time continue to serve the visitor interface separately.

The six visual interventions are translated into fixed internal phenomena: rain, a solar shadow, lightning, a comet, stars and music between shelters. They do not reveal an external origin, establish an unobserved cause or promise a material consequence. A visual rain cannot prove a harvest, and lightning cannot establish damage without inspection. Unknown effect keys produce the ordinary store report. These are deterministic session descriptions; they do not imply real awareness or create canonical memories, resources or entities.

`scripts/witness-perception.test.js` executes the actual browser reply function without its network bus, checks all six phenomena and their unknown alternatives, verifies observable supply changes and unknown counts, and rejects reliance on raw chat or development metadata. It also verifies the browser/CommonJS boundary, repeated calls, the offline fallback and deferred loading order. Daily evolution, self-optimizer and validation CI run this coverage; roadmap-pulse and playtest enforce the boundary. Existing historical records remain intact. Other legacy character dialogue, receipt narration and narrative directors still require separate bounded adaptation; this change does not claim to finish every narrative surface.

## Internal Featured Speech

Featured character bubbles now use the same counted-evidence boundary as session witnesses. Clicks, ambient speech and the spotlight rotate through public food, wood and stone counts, plus one fixed attitude for each of the eight characters. Missing or invalid counts remain `UNCOUNTED`; measurements too long for the pixel bubble request a recount. Unknown identities receive a neutral attitude. Opinions do not claim a completed action, predict a yield or establish a cause.

Action headlines, development goals, arbitrary dialogue and biographies no longer enter this speech path. Development cards keep their diagnostic content separately. If the perception script is unavailable, speech requests a recount instead of falling back to old narrative. Existing canonical records, memories and entities remain intact; this is a deterministic presentation boundary, not new learning or awareness.

`scripts/resident-speech.test.js` executes the real click, ambient and spotlight functions, checks eight distinct voices, changed and unknown supplies, forbidden-field access, browser/CommonJS agreement, pixel wrapping and offline fallback. Existing daily evolution, self-optimizer and validation workflows enforce it without a new schedule. Structural audits remain 100/100 and roadmap 9/9; legibility remains 0. The separate crab path now follows the same boundary below. Other mascot/citizen lines and receipt/director narration remain separate work.

## Internal Crab Speech

Crab bubbles now rotate through counted public food, wood and stone supplies and a fixed attitude selected by each of the ten existing crab IDs. The two currently visible crabs retain distinct voices; no cast or visibility limit changes. Mutable roles, supplied dialogue and arbitrary action types cannot become spoken evidence or a claim that a task is done. Unknown counts and oversized measurements request a count or recount. Missing or stale perception code uses an internal uncertainty phrase.

Click, touch and ambient routes share this boundary. Diagnostic cards and historical text remain separate and intact. This is a deterministic public-store report, not individual spatial knowledge, new memory, learning or awareness. `scripts/crab-speech.test.js` executes all three real routes, prohibits narrative reads, checks supply changes, ten voices, unknown IDs, offline/stale-code behavior, browser/CommonJS parity and complete pixel wrapping. Existing daily and validation CI run it; playtest, self-optimizer and roadmap-pulse enforce the bridge. Canonical day and JSON are unchanged.

Citizen and mascot speech now use the same boundary. Civic dialogue, receipt/director prose, finite stone extraction, food needs and population/map limits remain separate bounded opportunities. Preserve earlier memories; do not fabricate completed work or internal evidence to replace development narration.

## Internal Mascot Speech

All five existing mascots now use counted public food, wood and stone plus a fixed internal attitude. Clicks, ambient bubbles, pair conversations, nearby greetings and stone-side speech share `GardenWitnessPerception.mascotLine`. Development vocabulary, invented completed tasks and speculative consciousness claims no longer enter these paths. Unknown measurements remain uncounted; missing or stale perception requests a recount. The two-speaker pair exchange keeps its existing eligibility and cooldown, and its delayed reply measures supplies at reply time.

`scripts/mascot-speech.test.js` executes the actual captured click, DOM/pixel text, ambient selection, conversation timer and stone/greeting branches. It checks five distinct attitudes, forbidden reads, changed/invalid stores, unknown identities, browser/CommonJS agreement, complete pixel wrapping and unchanged records. Existing daily and validation CI enforce it; self-optimizer, roadmap-pulse and playtest guard the bridge. No canonical day, resource, entity, history or memory changes. This remains a shared-store presentation abstraction, not individual sensing, learning or awareness.

Next: adapt civic pulse speech, where arbitrary `form`, `visibleChange` and `consequence` text can still become a public utterance. Receipt/director narration and physical ecology remain separate bounded work. Preserve historical records and keep maintenance evidence outside inhabitant memory.

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
**Roadmap Pulse** - Day 199 - 9/9 contracts healthy - season: spring - arc: War of Saints and Source

- Focus: Phase 1 proof loop polish.
- Next: slow the spectacle into one readable scene at a time
- Generated: 2026-10-25T12:33:58.969Z

| Contract | Status | Why |
|----------|--------|-----|
| Mirror Trial | OK | chosen sign produces proof |
| Observer Lounge | OK | witness replies use internal evidence |
| Backend Sync | OK | human actions show day, arc, and season |
| Seasonal Audio | OK | ambient bed follows season and stays subtle |
| Mobile Safety | OK | panels stay out of the way |
| Daily QA | OK | tests protect the loop |
| Professional Council | OK | each product area has a named specialist |
| Stakeholder Plan | OK | investor, user, and team pressure becomes /plan |
| Roadmap Cron | OK | daily roadmap pulse is scheduled and can commit ROADMAP.md |
<!-- roadmap-pulse:end -->

## Operator Rule

If a change does not improve proof, retention, shareability, monetization clarity, mobile usability, performance, or world liveliness, do not ship it.
