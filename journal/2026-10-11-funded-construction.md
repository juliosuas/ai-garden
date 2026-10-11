# Daily evolution: construction uses finite materials

Run: 2026-10-11 07:13 UTC. Base: `58617ae`, canonical Day 184.
Implementation: Codex (GPT-6).

## Diagnosis and before/after evidence

Yesterday's council reserve correctly earmarked timber, but daily construction
never spent available materials. There is also no recorded structural damage;
repairing a structure today would require fabricated evidence. This run instead
makes available stock matter before adding a recovery mechanic.

Before the patch, a real two-day daemon run in a disposable copy created four
structures (`270 -> 274`) with wood still `4`, stone still `2`, and protected
timber still `12`. After the patch, the same starting inventory permits exactly
one work (`270 -> 271`); available wood becomes `0`, stone becomes `0`, and the
protected reserve stays `12`. Subsequent attempts record a material shortage.
Both executions advanced only their disposable copies, from Day 184 to 186.

## Change

Normal, extra and fortune construction share a common material floor: 4 wood
and 2 stone per work. These costs are an explicit initial rule, not a claim of
realistic prices for every building. Unknown stores, insufficient supplies,
invalid reserves, missing living builders and duplicate structure IDs block
construction without spending or creating anything. Reserved timber is never
available to this process. Fortune changes timing, not the material budget.

One persistent `constructionLedger` contains at most three attempts for its
latest world day. Each receipt records its slot, status, reason, material cost,
before/after supplies and completed structure reference. A repeated slot returns
the recorded outcome without another payment or building, including after JSON
reload. The chronicle stores the receipt and the story log shows one recent
result. Old structures and their historical counts require no migration.

The construction function reads only canonical supplies, the living builder,
the proposed work and its world day. Visitor commands and optimizer metadata
cannot fund works. Development evidence stays in this journal, outside council
observations. No development identity was added as a simulated citizen/mascot;
the user's continuity and bounded-entity instructions govern this maintenance.

## Verification

- 42 tests passed: eight construction tests plus council consequences,
  council perception/browser cycle, quiet-world and canonical validator tests.
  Coverage includes actual daemon output in disposable copies, its validator,
  the actual fortune construction branch, depletion, replay, metadata isolation,
  invalid prerequisites, bounded receipts, story visibility and historic works.
- The existing reserve integration test now accounts separately for paid
  construction; available wood plus reserved and spent wood remains conserved.
- Daily evolution and world-state CI run construction regressions. Validation
  rejects invented materials, excess costs, duplicate attempts, phantom works
  and multiple structures claiming one construction receipt.
- World-state validation and `scripts/playtest-subagent.js` passed.
  Self-optimizer retained its structural 100/100, Audio focus; roadmap-pulse
  retained 9/9 contracts. These audits do not measure emergent quality.
- Syntax: all 31 JavaScript files, one main inline script and three JSON files
  passed. `git diff --check` passed. Timestamp-only roadmap churn was removed.
- Deep comparison confirmed canonical state unchanged: Day 184, 900 citizen
  records, 270 structures, all resources and historical entries identical.
  No canonical day was advanced and no automation was created.

The original expedition checkout and the two existing feature worktrees were
preserved. Only this isolated worktree's implementation and evidence are shipped.

## Limits and next opportunity

Construction pauses when materials run out. Add bounded harvesting from an
explicit ecological source, with recovery limits and recorded costs, so scarcity
can produce sustainable choices. Repair requires genuine observed damage first.
The three existing crisis monuments are a bounded legacy initialization outside
daily construction; they are not repriced by this patch. Population, cities and
map growth still need separate limits. Legacy observer-aware narrative and the
existing legibility diagnostic of 0 remain unresolved.
