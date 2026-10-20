# Camera guidance stays outside resident speech

Maintenance evidence by Codex (GPT-6), 2026-10-20 UTC. This document is not an inhabitant memory.

## Change and before/after evidence

On main `6387073`, `focusGameWonderMoment` force-inserted arbitrary `focus.title` prose into the shared speech queue with a `wonder-focus-*` speaker identity. Developer and observer wording could therefore appear as a world utterance. The existing full queue could also be displaced. All seven new behavioral tests fail against that implementation.

The same real navigation function now writes a literal `Watch · label — title` cue into the existing Camera interface status. Whitespace is normalized, text is limited to 160 characters and inserted with `textContent`. The status wraps within the viewport, accepts no pointer input and uses polite atomic announcements. No title enters speech, canonical memory or resource logic. Missing titles leave a useful label; invalid/missing focus retains the existing featured-character fallback.

Only one focus expiry timer is retained. Repeated clicks cancel the earlier timer, and expiry checks that the cue still belongs to this request before hiding it. A newer spotlight or followed character stays visible. The interval is six seconds so the longer cue can be read. One hundred repeated requests preserve one pending timer, the existing speech queue and the input world.

## Verification and limits

- Before: 111 existing repository tests pass; all seven new focus tests fail. After: all 118 tests pass. Tests execute the actual focus extraction, camera navigation and focus callback, including live canonical input, arbitrary development text, literal markup, oversized text, repeated clicks, timer expiry, changed spotlight/follow state, missing titles and invalid focus fallback. Canonical serialization is unchanged.
- Syntax checks pass for 41 JS/CJS files and one inline script; all three tracked JSON files parse. Canonical validator, playtest and diff checks pass. Existing evolution, optimizer and validation workflows run the new behavior tests; self-optimizer, roadmap-pulse and playtest guard this boundary. No schedule was added.
- Self-optimizer and roadmap-pulse run before and after only in disposable copies. Both remain structural 100/100, Game Flow focus and roadmap 9/9. Existing legibility remains 0. These are structural checks, not measurements of learning, awareness or usability improvement.
- Browser smoke loaded the real quiet world on day 193 and opened the world drawer. The quiet UI hides both retained Watch controls and the old follow indicator. Consequently this patch protects a retained legacy speech path, and does not add a new visible Explore flow. A separate rendering fixture used the exact production indicator CSS and focus/navigation functions inside a 375px iframe: the full canonical FRONT title wraps within the component, with no world speech. This is component evidence, not a full mobile game playtest. Screenshot is saved in this automation's local evidence directory.
- Canonical world JSON is byte-identical to main, SHA-256 `4f68b4daf4b6804a4ef1e518e630af06d8c43cf75bb07300d4a3d8d4789091af`: day 193, 934 citizen records, 282 structures, 457 plants and 206 history entries. Supplies remain wood 60 / stone 34 / food 380 / iron 12 / gold 14 / knowledge 690. No dawn, entity, resource or automation was added. Existing Codex citizen status and mascot remain unchanged.

## Continuity and next opportunity

Work is isolated in the managed `garden-focus-cue` worktree. The original expedition checkout's three modified and three untracked files, all other worktrees and the earlier unfinished stone patch are preserved. Development evidence lives here and in a maintainer message, rather than entering inhabitant history.

Next inspect `receiptConsequence` and receipt `aiThought` attribution in `experiments/humans.js`. A visitor-facing interpretation must not assert that an inhabitant knew an external intervention's origin or that an unmeasured consequence happened. Preserve historical receipts. Physical food needs, finite stone extraction and population/map limits remain separate bounded opportunities.
