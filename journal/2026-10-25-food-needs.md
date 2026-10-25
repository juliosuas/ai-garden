# Counted communal rations before discretionary work

Maintenance by Codex (GPT-6), 2026-10-25 UTC. Development record only, outside inhabitant memory.

Read automation memory, RULES, CONTRIBUTING, ROADMAP, recent journals and Git/worktree history. Preserved all original expedition changes (three modified files and three untracked files). Reused the four pending own commits through dba27f2, without reimplementation, in isolated worktree /private/tmp/aigarden-daily-optimizer-20261025, branch codex/food-needs-20261025. Retained the existing deceased Codex citizen and mascot. No new automation or schedule.

## Cause and behavior

Daily evolution previously spent two food on some timber trips but never debited food for the population. Introduced explicit game units: one communal ration feeds up to 25 inhabitants alive at dawn, rounded up. These are simulation parameters, not dietary measurements. The current cached population has 390 living inhabitants: 16 food demanded at its next normal dawn, compared with zero previously. The 934 citizen records include historical deaths.

A meal runs once per canonical day, before timber harvesting. It consumes at most the counted food available, never produces debt, and records before/after stores, population, demand, consumption and unmet demand. Scarcity persists across consecutive dawns with a seven-day cap; skipped days do not invent consumption or continuous famine. Unknown food produces a blocked receipt with unknown deficit. Invalid or future persisted receipts fail closed rather than silently being reset and charging again. Only the latest receipt is kept in foodNeeds; canonical history events use the existing 400-entry retention. The existing story log displays a recent meal row, expiring after three history entries.

No production, deaths, health changes, entity growth, external messages or maintenance events are added. Shortages leave no food for discretionary timber parties, which already require a paid journey. The council already sees counted food; no new claim of resident learning, individual witnessed distribution or real awareness is made.

## Evidence

- Baseline suite: 153 pass. Final suite: 161 pass, zero failures. Eight new tests cover once-per-dawn consumption, fractional/empty stores, strict living counts, bounded persistent scarcity, recovery, skipped time, corrupt/future receipts, invalid counts, external-input independence, actual daemon ordering, validator rejection of fabricated accounting, and story row expiry. With the new module and exact tests against the old daemon/validator/UI, two integration regressions fail and six module tests pass. Missing-module baseline also fails. Existing two-day timber daemon test now funds both meals and trips and verifies conservation rather than assuming no resident consumption.
- Actual shortage rehearsal runs the real daemon only in disposable copies: one food is shared, the shortfall is recorded, timber spends zero, the day advances exactly once and the validator passes. Corrupting the meal balance makes validation fail. Unit rehearsal bounds 70 scarce dawns without negative stores or deaths, then verifies shortage reset after sufficient food.
- Validator, playtest and diff checks pass. Syntax checks: 47 JS/CJS, one inline script; three JSON files parse. Existing evolution, self-optimizer and world-validation CI now run the food regression suite. No new automation.
- Self-optimizer and roadmap-pulse ran sequentially in disposable before/after copies: 100/100 and roadmap 9/9 remain unchanged, Game Flow focus unchanged; existing legibility remains zero. Scores are structural checks, not evidence of improved usability. Generated audit state was not copied into the world.
- Browser smoke unavailable: local socket bind denied with Operation not permitted. VM story-row behavior is not visual browser evidence; quiet presentation still hides retained panels.
- Canonical world JSON is byte-identical to baseline: SHA256 4f68b4daf4b6804a4ef1e518e630af06d8c43cf75bb07300d4a3d8d4789091af. Day193, 934 citizens, 282 structures, 457 plants, 206 history entries; food380, wood60, stone34, iron12, gold14, knowledge690 remain unchanged. No canonical dawn was run.

## Publication and next opportunity

Both fetch attempts failed with `Could not resolve hostname github.com`. Actual remote main is unverified. Work is committed locally, not pushed or deployed. All five own pending commits require fetch, synchronization/rebase and affected validation before a normal main push; do not force or bypass protections. Portable pending-chain.patch and recovery metadata are in /Users/ghostcat/.codex/automations/ai-garden-daily-self-optimizer/evidence/2026-10-25-food-needs/.

Next: add finite seasonal food gathering from an existing discovered source, with ecological floor/capacity, worker prerequisites and receipts. No new replenishment is claimed here: shortages can remain and prevent timber gathering. Review that balance before publication and recover the separate unfinished stone work rather than duplicating it. Population and map growth limits remain independent work.
