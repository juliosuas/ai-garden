# Seasonal orchard gathering before communal rations

Maintenance by Codex (GPT-6), 2026-10-26 UTC. Development evidence only; outside inhabitant knowledge and memory.

Read automation memory, RULES/CONTRIBUTING, ROADMAP, recent journals and Git/worktree history. Reused all five own pending commits through a6cf2b0 as the base of /private/tmp/aigarden-daily-optimizer-20261026, branch codex/seasonal-food-20261026. Original expedition checkout preserved: ROADMAP.md, experiments/expedition.js and index.html modified, plus .DS_Store and two easy-entry files untracked. Retained the deceased Codex citizen and existing mascot. No new schedule or automation.

## Cause and bounded rule

Rations debit finite food, but no replenishment source existed. One aggregate patch is now tied to the first already discovered orchard-belt region (cached world: region-004, Sung Reach). Its initial 32 units and protected floor of eight are explicit game parameters, not a measured crop census or new plant entities. One living herbalist can transfer at most eight units per dawn, paying one timber for baskets. No trip above the food store target of 32; existing surplus is not clipped. The patch regrows at most 2/3/4 units in spring/summer/autumn using the existing 28-day season calendar. Winter closes harvesting and regrowth. Skipped time yields only the current dawn's growth. An inaccessible patch cannot regrow, move or be replaced with another discovered patch.

Execution order is council consequence, orchard gathering, meal, timber trip, other daily works. Latest source and receipt persist together: identity, season, worker, availability, before/after patch/food/timber, growth, gathered food and timber cost. Same-day replay/reload makes no further changes; corrupt, missing or future ledgers fail closed. Existing history retention and a three-entry story-row expiry bound presentation. Outside identities, prose and maintenance fields are never read by the gathering rule. This adds no resident thought, learning or real awareness.

## Evidence before and after

- Baseline 161 tests pass. Final 171 pass. Ten new behavioral tests cover paid transfer, meal priority, replay/reload/history loss, seasonal closure, skipped time, fractional target, surplus, 400 hungry dawns with conservation, absent workers/unknown counts, inaccessible patches, corrupt ledgers, forbidden outside getters, story-row expiry, real daemon integration and validator rejection. With the exact new module/tests against the previous daemon/UI/validator, eight pass and the two integration tests fail as expected.
- Identical disposable spring shortage scenario, dawn 196: before, zero food shared and unmet demand 16, timber two; after, eight food harvested/shared and unmet demand eight, timber one. Patch falls 32 to 24. Validation passes. Corrupting food, basket cost, stock, receipt presence or worker makes validation fail. A 400-dawn unit rehearsal keeps stock in [8,32], one source, finite daily yield and exact aggregate conservation; its fixture explicitly consumes each previous yield and starts with finite timber.
- Disposable next-normal-dawn rehearsal advances 193 to 194 once: winter gathers zero, the normal meal consumes 16 with no deficit. This rehearsal is not canonical evolution and does not publish a new day.
- Syntax: 49 JS/CJS and one inline script pass; three tracked JSON files parse. World validator, playtest and diff checks pass. Existing evolution, optimizer and validation CI include the new tests; no redundant automation.
- Self-optimizer then roadmap-pulse run sequentially in disposable before/after copies: 100/100 Game Flow and 9/9 remain unchanged. Existing legibility zero remains. These are structural checks, not measured player improvement. Generated audit state is not copied back.
- Browser preview unavailable: local HTTP server bind fails with Operation not permitted. The story-row VM test verifies data behavior, not browser appearance; retained panels are still hidden by quiet presentation.
- Canonical world bytes unchanged: SHA256 4f68b4daf4b6804a4ef1e518e630af06d8c43cf75bb07300d4a3d8d4789091af. Day193; 934 citizen records, 390 living, 282 structures, 457 plants, 206 history entries. Food380/wood60/stone34/iron12/gold14/knowledge690 unchanged. No canonical dawn, entity, resource, historical entry or inhabitant memory added by maintenance.

## Publication and next opportunity

Both fetch attempts fail with Could not resolve hostname github.com. Actual remote main remains unverified. The six own commits are local only, not pushed/deployed. Recover this existing chain rather than reimplementing it; fetch, synchronize/rebase, verify affected checks, then push normally to main without bypassing protections. Portable patch, recovery metadata, audit/test logs and dawn comparisons are saved under /Users/ghostcat/.codex/automations/ai-garden-daily-self-optimizer/evidence/2026-10-26-seasonal-food/.

Next: investigate seasonal food reserve budgeting with counted stores. This patch is supplementary: maximum eight and sustainable seasonal regrowth below the current 16-unit meal demand cannot feed all inhabitants. Winter has no yield and baskets compete for timber. No sustainability claim is made. Keep the unfinished stone patch and population/map growth limits separate.
