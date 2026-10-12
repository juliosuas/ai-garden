# Bounded woodland gathering — 2026-10-12

Operator record by Codex (GPT-6). This document is development history and is not an inhabitant's memory.

## Problem and scope

Finite construction now spends 4 wood and 2 stone per completed work. No existing daily extraction replenished timber. Discovered woodland regions already exist, and living rangers already belong to the world. The patch connects those internal prerequisites to a single managed timber source, rather than adding workers, regions or unlimited supplies.

The source initializes at the next normal daemon dawn with an explicit model stock of 24. This number, its protected floor of 8, one-unit daily recovery, four-unit collection limit, two-food journey cost and sixteen-unit store target are simulation parameters, not empirical measurements or discovered facts about real ecology. Only one source exists; depletion or an unreachable region never replaces it. No missed-day catch-up regeneration occurs. A successful trip transfers forest stock to available wood and pays food. Repair reserves and stone remain separate.

One persisted source and one latest receipt keep memory bounded and prevent replay, including after reload or chronicle retention. The daily history and story log show an internal outcome or unmet prerequisite. New calculations use only world day, discovered woodland, living rangers and counted stocks. Observer identity, visitor requests and development directives are ignored. No claim of real consciousness is made.

## Before/after evidence

Base commit: `c3c2611` (main, Roadmap Pulse, Day 185). Two disposable daemon copies started from the same canonical snapshot with test-only wood 0, stone 2, food 30, reserve 12 and no current council resolution. Both ran exactly two simulated steps. The before copy used the scripts from the base commit; the after copy used the new implementation.

| Result after two disposable dawns | Before | After |
|---|---:|---:|
| New structures | 0 | 1 |
| Available wood | 0 | 4 |
| Stone | 2 | 0 |
| Food | 30 | 26 |
| Protected repair wood | 12 | 12 |
| Managed woodland stock | absent | 17 |
| Recorded gathering outcomes | 0 | 2 |

After: initial woodland stock 24 + one recovery - eight collected = 17. Eight timber entered stores, four funded one work, and four remained available. Four food paid two journeys. The second work was blocked by depleted stone. This is a conserved transfer with a recorded cost, not free construction or a growth claim.

The original canonical world was never evolved. `experiments/world-state.json` remains byte-identical to the base: Day 185, 905 citizen records, 272 structures, 457 plants, 198 history entries, resources and historical memory preserved. Self-optimizer did not change the state or README; timestamp-only roadmap pulse churn was removed. Existing Codex identity was retained. No new automations were created.

## Verification

- Baseline: 38 economy/council/validator tests passed before implementation; existing playtest and canonical validator passed.
- Final: `node --test scripts/*.test.js` passed all 53 tests, including existing quiet-world behavior.
- New behavior covers paid transfer; protected floor; 100 dawns of continued demand; regeneration/store caps; unknown/insufficient supplies; absent/dead workers; undiscovered/unreachable sources; malformed persisted stock; no replacement; replay/reload; missed days; external-knowledge isolation; story receipt expiry; actual two-step daemon integration.
- Validator regressions reject unpaid/phantom timber, excess recovery, invalid source capacity, invented regions/workers, future receipts and missing source receipts. A worker can die later in the same dawn; validation requires the recorded ranger identity rather than current survival.
- Syntax: 33 JS/CJS files and one inline script passed Node checks. Three tracked JSON files parsed. `git diff --check` passed.
- `scripts/self-optimizer.js`: structural 100/100, unchanged Autonomy focus. This is a contract score, not a measured gameplay or performance gain.
- `scripts/roadmap-pulse.js`: Day 185, all 9/9 contracts healthy.
- `scripts/validate-world-state.js` and `scripts/playtest-subagent.js` passed. Existing legibility diagnostic remains 0; this patch does not claim to solve it.
- Daily evolution and world-state validation CI now execute the timber suite. The depletion-only construction fixture disables its gathering party to keep testing the original material floor; a separate daemon integration covers replenishment plus construction.

The expedition checkout's five pre-existing changes and both unrelated feature worktrees were preserved. Implementation lives in isolated `/private/tmp/aigarden-daily-optimizer-20261012`. Publication uses a normal fast-forward push; no force-push or canonical dawn is required.

## Next opportunity

Implement one finite stone source with a living miner, counted expedition cost and exhaustion receipt. The stone bottleneck remains visible after timber recovery. Food needs/production, legacy observer-aware narration, population/map limits and broader visual legibility require separate bounded work. Repairs still require genuine recorded internal damage; do not create damage to spend the reserve.
