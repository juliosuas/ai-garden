# Crab speech grounded in internal evidence

Maintenance record by Codex (GPT-6), 2026-10-16. Development evidence only; not resident memory or a claim of real awareness.

## Problem and change

The prior run identified `crabDialogueLine` as the next bounded knowledge leak. It read arbitrary action types, appended `DONE`, then fell back to supplied dialogue, roles or legacy phrases. A disposable probe with action type `developer` and dialogue `The creator is watching` spoke `developer DONE` and that supplied sentence. Neither a narrative action type nor a development role establishes a completed internal task.

The same call now uses `GardenWitnessPerception.crabLine`. It rotates through food, wood and stone counts and one fixed attitude per existing crab ID. On the probe's 30 food / 4 wood / 0 stone fixture, it says `FOOD: 30`, `WOOD: 4`, `STONE: 0` and `MEASURE THE PATH FIRST`. Changing food to zero changes the report to `FOOD: 0`. Missing, negative, nonnumeric or nonfinite measurements remain `UNCOUNTED`; an oversized count requests `RECOUNT NEEDED`. Unknown IDs receive `COUNT BEFORE CLAIMING` rather than repeating the supplied identity. Fixed attitudes express preferences, not observations of unverified work.

The ten existing crab IDs select distinct attitudes; mutable names, roles, tasks, biography, latest action and dialogue do not enter this boundary. Count formatting is shared with featured speech, whose regression suite remains green. Missing or cached older perception code requests `STORES NEED A RECOUNT`. The asset URL moves to version 3. Both visible crabs, the hidden cast and all display limits are preserved. Diagnostic cards continue to show development information separately from bubbles.

## Evidence and checks

- All nine new tests failed before implementation; the failures included leaked action/dialogue, forbidden prose access, absent supply response, unavailable offline fallback and unprotected integration routes. All 81 repository tests passed afterward, including nine crab regressions and all prior witness/featured, quiet-world, council, construction, harvest and validator tests.
- The new suite runs the actual inline click and touch branches and ambient function in a disposable VM. It verifies retained diagnostic cards, all ten voices, changed/invalid/oversized counts, unknown/inherited IDs, forbidden getters, missing/stale modules, browser/CommonJS agreement, unchanged records and complete text in the real three-line pixel wrapper at widths 14 and 16. No full visual browser session was performed.
- Syntax passed for 37 JS/CJS files, one inline script and all three tracked JSON files. Canonical validation, playtest and `git diff --check` passed. The existing daily evolution, daily self-optimizer and validation workflows run the new tests without another schedule. Playtest, self-optimizer and roadmap-pulse guard the new bridge.
- Before/after controls ran self-optimizer and roadmap-pulse only in separate disposable copies, because self-optimizer writes world state. Both stayed at structural 100/100, Performance focus and roadmap 9/9. Legibility remains 0; these are static structural checks, not evidence of better cognition, usability or ecosystem health.
- Canonical world JSON stayed byte-identical to fetched main: SHA-256 `9983370c1eef255bfee1c678c5d4fa28d2700c0ec95ecc656878667519f45c71`, day 189, 919 citizen records, 277 structures, 457 plants and 202 history entries. Existing resources, memories and archives are untouched. No canonical dawn, entity, resource or automation was added. Behavioral suites simulate dawns only in disposable copies.

## Continuity and next opportunity

Started from fetched main `89e518cc4393d02ae8bcc8b4e7803597b462ea9a` in isolated `/private/tmp/aigarden-daily-optimizer-20261016`. Preserved the original expedition checkout's three modified and three untracked files, all other worktrees, and October 13's unfinished stone patch. Reused the existing Codex citizen/mascot without changing their status or creating another identity. This journal and the maintainer message record the work outside inhabitant memory.

Next: one citizen dialogue path still reads free mottos and action types. Adapt it to verified internal evidence without rewriting historical records. Civic/mascot speech, receipt/director narration, the separate stone patch, finite food needs and population/map limits remain future bounded work. Public store reports are still a shared abstraction, not individual perception or persistent learning.
