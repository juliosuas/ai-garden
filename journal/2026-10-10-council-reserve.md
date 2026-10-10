# Daily evolution: a finite council repair reserve

Run: 2026-10-10 05:36 UTC. Base: `6a44464`, canonical Day 183.

## Before

The council retained its canonical daily resolution, but all consequences were
prose. Scarcity motions could claim that materials became a survival reserve
without changing a resource count or recording whether the promise was fulfilled.
The six initial consequence tests failed against the original code: no approved
reserve motion or next-dawn execution existed.

## After

One new scarcity motion reserves timber for survival repairs. Only its explicit
versioned effect can transfer materials, at the following dawn, before the next
resolution replaces the previous one. It moves at most 12 available wood into
`economy.repairReserveWood`, with a shared capacity of 24. It conserves available
plus reserved timber. The original vote and observation snapshot remain intact.

The separate, single `councilExecution` receipt records the causal resolution,
execution day, outcome, reason and before/after counts. Its decision-day marker
prevents duplicate or older allocations after reload or historical retention.
Unknown supplies, exhausted stock and a full reserve are blocked; missed dawns
expire. Legacy prose, unapproved votes and session projections do not allocate
materials. Other council motions retain their existing narrative behavior.

The daily chronicle stores the outcome. The story log shows one reserve result
from the last three world days. The council can count available and reserved
wood separately through its internal observation boundary; development metadata
and visitor identity remain excluded.

In a disposable fixture, a real two-step daemon run moved available wood
`30 -> 18` and reserved wood `0 -> 12` exactly once. Later allocations fill the
reserve to 24, then move zero wood. This is earmarked timber, not a completed
repair or a production bonus.

## Verification

- 32 tests passed: consequence, perception/browser cycle, canonical validator,
  and existing quiet-world suites. They include actual daemon execution in a
  disposable copy, conservation, replay, reload, failed prerequisites, finite
  accumulation, metadata isolation and story-log visibility.
- Daily evolution and world-state CI now run the consequence regression suite.
  Canonical validation rejects invalid reserves, invented timber and late or
  unapproved allocations.
- `node scripts/validate-world-state.js` and `node scripts/playtest-subagent.js`
  passed. The existing legibility diagnostic remains 0.
- `node scripts/self-optimizer.js`: unchanged structural score 100/100,
  Performance focus; `node scripts/roadmap-pulse.js`: 9/9 existing contracts.
  These structural scores do not measure emergent behavior or improvement.
- All 29 tracked/new JavaScript files, the main inline script and three tracked
  JSON files passed syntax/parse checks. `git diff --check` passed.
- Deep comparison with the base confirmed the canonical world is unchanged:
  Day 183, 894 citizen records, 269 structures, existing resources and history.
  Timestamp-only pulse churn was removed. No canonical evolution, new entity,
  resource creation, or automation was performed by this run.

The expedition checkout and both separate feature worktrees were preserved.
Only this isolated worktree's patch and evidence belong in the commit.

## Next opportunity

Define one bounded repair that consumes reserved timber and records a measurable
result. Prefer a real damaged structure with an internal evidence trail; do not
fabricate damage to exercise the mechanic. Track an unsuccessful attempt as well
as a successful one. Observer-aware legacy dialogue and the unresolved legibility
diagnostic remain separate work.

This journal is development evidence, outside the inhabitants' observations.
