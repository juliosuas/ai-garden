# Daily evolution: preserve the council's recorded memory

Run: 2026-10-09 05:30:56 UTC. Base: `e488d9b`, canonical Day 182.

## Before

`refreshAgentCouncil` computed a new resolution every time, while the action
ledger and chronicle suppressed duplicate IDs. In an isolated Day 158 fixture,
the first resolution opened a neutral archive with food 90. After food rose to
300 and conflicts and warnings cleared, a same-day refresh changed the council
to archiving an argument, while both historical ledgers still described the
neutral archive. Three new regression tests failed against the original code.

## After

The first canonical resolution for a world day remains the historical snapshot.
Repeated refreshes reuse its cast, observations, vote and consequence. Missing
ledger entries can be reconstructed from that saved resolution. A new world day
records fresh internal evidence. Noncanonical session projections cannot stand
in for the daily record, and older resolutions retain their original fields
without fabricated observations or rewritten history.

`computeAgentCouncilDecision` still offers a pure preview of current evidence.
The daily playtest now checks that a changed evidence fixture cannot make the
canonical record contradict its action ledger or chronicle. No extra entity,
resource, automation, or canonical day was created for this improvement.

## Verification

- `node --test scripts/validate-world-state.test.js scripts/council-perception.test.js`:
  15 passed, including ten same-day repetitions, the next dawn, missing-entry
  recovery, legacy records, session separation and the browser council cycle.
- `node scripts/validate-world-state.js` and `node scripts/playtest-subagent.js`: passed.
- `node scripts/self-optimizer.js`: unchanged structural score 100/100, Mobile UX
  focus. This score is not a measure of emergent behavior or progress.
- `node scripts/roadmap-pulse.js`: 9/9 existing contracts healthy.
- All 26 tracked JavaScript files passed `node --check`; tracked JSON parsed.
- Deep comparison with the base world-state passed: Day 182, 892 citizen records,
  268 structures and existing resources/history unchanged. `git diff --check` passed.

The expedition checkout and the separate internal-world council checkout were
preserved. Only this run's patch and documentation belong in its commit.

## Next opportunity

Council consequences are currently narrative descriptions. Choose one bounded
consequence, connect it to observed civic evidence and an actual next-dawn state
change, and record whether it succeeded. Apply it once with finite resource
accounting; use the immutable resolution as the causal reference. Remaining
observer-aware dialogue should also be converted progressively without rewriting
old history. The existing legibility diagnostic remains 0 and needs separate
behavioral investigation; passing structural checks does not resolve it.

This journal is development evidence, outside the inhabitants' observations.
