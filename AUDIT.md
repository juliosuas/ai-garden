# AI Garden — Technical Audit Report

**File:** `experiments/openclaw-garden.html`  
**Version:** 4 (The Living Garden v4)  
**Date:** 2026-03-16  

---

## 1. Current Persistence Model

### Save Key
```
localStorage key: "openclaw-garden-world"
```

### Save/Load Mechanism
- **Load:** `loadWorld()` runs on page load. Reads from `localStorage`, JSON-parses it, applies migration if version < 4, increments `visitCount`, updates `lastVisit`, advances the philosopher stone quote index, and grows all existing plants by 1 stage (capped at 5) and 40 age (capped at 300).
- **Save:** `saveWorld()` runs every **30 seconds** via `setInterval` and on `beforeunload`. Increments `totalTimeSpent` by 30 (seconds), snapshots current state, strips `_prevSnapshot` transient field, then writes to `localStorage`.
- **Reset:** `resetWorld()` prompts user confirmation, then removes the key and reloads the page.

### Complete World State Object Fields

| Field | Type | Description |
|---|---|---|
| `version` | number | Schema version (currently 4) |
| `firstVisit` | number | Timestamp (ms) of first ever visit |
| `lastVisit` | number | Timestamp (ms) of most recent visit |
| `visitCount` | number | Total number of page loads |
| `totalTimeSpent` | number | Cumulative seconds (incremented by 30 each save) |
| `plantsGrown` | number | Snapshot of `plants.length` at save time |
| `currentStage` | number | 1–5, progression stage |
| `plants` | array | Each: `{x, y, type, color, agent, growthStage, age, plantedVisit, plantedTime}` |
| `structures` | array | Rebuilt from `structuresBuilt` — each: `{id, x, y, w, h, color, label}` |
| `agentMarks` | array | Each: `{x, y, type, color, agent, visit}` |
| `history` | array | Each: `{day, visit, agent, text, time}` — capped at 200, trimmed to 150 |
| `milestones` | array | Each: `{type, text, visit, time}` — deduplicated by type |
| `mascotStats` | object | Per-agent stats object (see below) |
| `structuresBuilt` | array of strings | IDs of unlocked structures (e.g. `"bench"`, `"cottage"`) |
| `philosopherStone` | object | `{discoveries: number, currentQuoteIdx: number}` |
| `lastSessionSnapshot` | object | `{plants, stage, structures, agentMarks}` — for "since last visit" diff |
| `wishes` | number | Shooting stars caught |
| `weatherPhase` | number | Index into weather cycle (0–3) |

### mascotStats Structure
```json
{
  "Jeffrey":  { "plants": 0, "built": 0, "interactions": 0 },
  "Claude":   { "plants": 0, "waters": 0, "interactions": 0 },
  "GPT-4":    { "plants": 0, "ideas": 0, "interactions": 0 },
  "Gemini":   { "plants": 0, "deliveries": 0, "interactions": 0 },
  "Codex":    { "plants": 0, "conversations": 0, "interactions": 0 }
}
```

### Transient (Not Saved) Fields
- `_prevSnapshot` — attached during `loadWorld()` for memory panel diff, stripped before save

---

## 2. What Resets on a New Visit (New Browser/Device)

### First-Time Visitor Experience
When `localStorage.getItem(SAVE_KEY)` returns `null`:

1. A **deep copy** of `defaultWorld` is created
2. `visitCount` = 1, `firstVisit` = now, `lastVisit` = now
3. History entry: `"The garden was born — a blank canvas awaits"`
4. **Stage 1: Empty Field** — bare grass with no plants, no structures
5. Weather starts at phase 0 (`sunny`)
6. No milestones, no philosopher stone discoveries, no wishes
7. All mascot stats are zero

### Returning Visitor Experience
1. `visitCount` incremented
2. All existing plants **grow by 1 stage** (max 5) and gain 40 age (max 300) — simulating offline growth
3. Philosopher stone quote rotates to next index
4. `_prevSnapshot` is captured for the Memory panel's "Since last visit" diff
5. History entry: `"Visit #N — The garden awakens"`
6. Weather continues from saved `weatherPhase`

**Key difference:** A returning visitor sees a **lush, populated garden** with accumulated plants, structures, agent marks, and history. A new visitor sees an **empty field** with zero progress.

---

## 3. What's Lost (localStorage Cleared or New Device)

**Everything.** The entire world state is localStorage-only. Specifically:

| Category | What's Lost |
|---|---|
| **Plants** | All planted flora — positions, types, colors, growth stages, ages, who planted them, which visit |
| **Structures** | All unlocked buildings (bench, cottage, fountain, houses, etc.) — up to 13 possible |
| **Agent Marks** | All agent-specific decorations (crystals, lanterns, mushrooms, vines, flowers) |
| **History** | Full garden history log (up to 200 entries) |
| **Milestones** | All achieved milestones (first plant, stage transitions, 10th wish, etc.) |
| **Philosopher Stone** | Discovery count and current quote index |
| **Wishes** | Total shooting stars caught |
| **Mascot Stats** | All per-agent contribution counters (plants, waters, ideas, deliveries, conversations, interactions) |
| **Visit Tracking** | Visit count, first visit date, total time spent |
| **Weather Phase** | Current position in weather cycle |
| **Stage Progress** | Current progression stage (1–5) |
| **Session Snapshot** | "Since last visit" comparison data |

**Nothing survives.** There is zero server-side persistence, no URL-based state, no cookies fallback, no IndexedDB fallback.

---

## 4. Synchronization Challenges

### 4a. World State vs Local State

**Shared "World State" (should sync across visitors):**
- `plants[]` — the garden's flora IS the game
- `structures[]` / `structuresBuilt[]` — built environment
- `agentMarks[]` — environmental decorations
- `history[]` — shared garden chronicle
- `milestones[]` — shared achievements
- `mascotStats` — agent contribution counters
- `currentStage` — progression level
- `plantsGrown` — total count
- `philosopherStone.discoveries` — cumulative
- `wishes` — cumulative shooting stars caught
- `weatherPhase` — should be deterministic/shared
- `firstVisit`, `visitCount`, `totalTimeSpent` — aggregate metrics

**Local/Personal State (should stay per-device):**
- `camX`, `camY` — camera position
- `followingMascot` — which mascot you're tracking
- `selectedMascot` — info panel target
- `activeMiniMascot` — minimap highlight
- `minimapZoomed` — minimap zoom state
- `dayTime` — local day/night cycle progress
- All UI panel visibility states (`historyVisible`, `statsVisible`, `memoryVisible`)
- Transient animations: `particles`, `speechBubbles`, `butterflies`, `fireflies`, `raindrops`, `confetti`, `musicNotes`, `giftAnimations`, `highFiveAnims`, `shootingStars`
- `_prevSnapshot` — personal "since last visit" diff

**Gray Area:**
- `lastVisit` — could be per-visitor or global "last anyone visited"
- `visitCount` — should this be total across all visitors, or per-visitor?
- Mascot positions (`mascots[].x`, `.y`, `.state`) — these are reinitialized each session from hardcoded defaults and simulated in real-time. In a shared world, you'd need to decide if mascot movement is deterministic (seeded) or server-authoritative.

### 4b. Race Conditions

**Concurrent planting:**
- Two visitors both have mascots planting simultaneously → both append to `plants[]` → if using last-write-wins, one visitor's plants get overwritten
- The `plants[]` array has a **cap of 300** (trimmed to 250) — concurrent visitors could fight over this limit

**Concurrent structure unlocking:**
- Two visitors reaching Stage 3 simultaneously both try to add `cottage` and `fountain` to `structuresBuilt[]` → duplicate entries possible

**History writes:**
- Both visitors append history entries → if using simple overwrite, entries get lost
- History is trimmed from 200 → 150, so trimming races could lose different entries

**Weather phase advancement:**
- `weatherTimer` is local (resets to 0 on load) — two visitors would advance weather independently, causing `weatherPhase` divergence

**Save timing:**
- 30-second save interval means stale reads are very likely
- `beforeunload` save can race with another visitor's periodic save

### 4c. What Would Need to Change

1. **Plants array** → needs append-only log with unique IDs, or CRDT-style merge
2. **Counters** (visitCount, wishes, mascotStats) → need atomic increment or conflict-free counters
3. **History** → append-only with deduplication by timestamp+agent
4. **Milestones** → set-union merge (deduplicated by type already, which helps)
5. **StructuresBuilt** → set-union merge (already deduplicated by ID check)
6. **Weather** → derive deterministically from wall-clock time rather than local timer
7. **Mascot simulation** → either run identically on all clients (deterministic seed from shared state) or accept visual divergence (mascots are cosmetic, not world-altering… except they DO plant things)

**Critical issue:** Mascots autonomously plant things every frame. If mascot simulation runs independently on N visitors, each visitor generates different plants at different positions. This is the biggest sync challenge.

---

## 5. Recommended Architecture (Static GitHub Pages)

### Option A: Commit `world-state.json` to the Repo

**How it works:**
- Commit a `world-state.json` to the repo
- On page load, `fetch('world-state.json')` to get shared state
- Merge with any localStorage state
- Display combined state

**Pros:**
- Zero external dependencies
- Free, reliable, versioned (git history IS your backup)
- Works offline (localStorage fallback)
- CDN-cached via GitHub Pages

**Cons:**
- **Read-only for visitors** — no one can write back without committing
- Stale until next commit — GitHub Pages CDN caches aggressively (10 min+)
- Someone (human or CI) must periodically commit updated state
- Not real-time or even near-real-time
- Two-way sync requires a GitHub Action or external process

**Best for:** Curated "canonical" world state that an admin periodically snapshots

### Option B: Free JSON Storage Service (jsonbin.io, npoint.io)

**How it works:**
- Create a JSON bin with initial world state
- On load, fetch from bin URL
- On save, PUT/PATCH to bin URL
- Client-side merge logic

**Pros:**
- True read/write from the browser
- Simple REST API (fetch + PUT)
- Free tiers available (jsonbin: 10k requests/month, npoint: unlimited reads)
- Near-real-time (no cache layer)

**Cons:**
- **API key exposed in client-side code** — anyone can overwrite/vandalize
- Rate limits on free tiers (jsonbin: 120 req/min)
- No conflict resolution — last write wins
- Service could disappear or change terms
- No authentication = no protection against malicious writes
- npoint has no write auth at all; jsonbin requires exposed secret key

**Best for:** Small trusted audience, prototype/demo, acceptable vandalism risk

### Option C: GitHub API to Read/Write a File in the Repo

**How it works:**
- Use GitHub Contents API (`GET /repos/:owner/:repo/contents/world-state.json`) to read
- Use same API with PUT + SHA to write (requires auth token)
- Could use a GitHub App or fine-grained PAT

**Pros:**
- Versioned writes (every save is a commit)
- Can use branch protection, PR-based writes
- Full audit trail
- GitHub Actions can validate/merge state on push

**Cons:**
- **Auth token must be exposed or proxied** — PAT in client JS = security disaster
- GitHub API rate limit: 60 req/hr unauthenticated, 5000/hr authenticated
- Write requires SHA of current file (optimistic concurrency, but complex client logic)
- Each write = a commit = notification noise, repo bloat
- GitHub Pages rebuild on each commit (1-2 min delay)
- Not suitable for frequent saves (every 30s × N visitors = way over rate limits)

**Best for:** Infrequent, authenticated writes (e.g., admin tool commits state)

### Recommendation

**Hybrid approach (A + B):**

1. **Primary read source:** `world-state.json` committed to repo (Option A) — this is the "canonical" state, fetched on every page load
2. **Live writes:** Use a lightweight service like **Val Town** (free serverless functions), **Cloudflare Workers KV** (free tier: 100k reads/day, 1k writes/day), or **Firebase Realtime Database** (free tier: 1GB storage, 10GB/month transfer)
3. **Merge strategy:** On load, fetch both remote state and localStorage. Merge using:
   - Plants: union by hash of `(x, y, agent, plantedTime)` 
   - Counters: take max
   - History: union by timestamp, sort, trim
   - Milestones: set union by type
   - Structures: set union by ID
4. **Periodic snapshot:** GitHub Action runs daily, reads from live service, commits `world-state.json` as backup

**If truly zero-backend:** Option A with a GitHub Action that accepts state updates via issue comments or workflow dispatch. Visitors submit their session diff as a GitHub Issue (using `fetch` to GitHub API with a fine-grained PAT scoped only to issues), and a GitHub Action merges approved diffs into `world-state.json`.

---

## 6. Current Bugs & Issues

### 🔴 Critical

1. **`totalTimeSpent` inflates incorrectly** — `saveWorld()` adds 30 to `totalTimeSpent` every call, but it's called every 30s AND on `beforeunload`. The `beforeunload` call adds an extra 30s each visit. Over many visits, this accumulates error. The time tracking assumes exactly 30s between saves, but the interval isn't guaranteed.

2. **`structures` array is rebuilt but also saved** — `rebuildStructures()` runs on load and overwrites `world.structures` from `structuresBuilt`. But `saveWorld()` also saves the `structures` array. This is redundant but harmless. However, if `STRUCTURE_DEFS` changes between versions (moved positions, new fields), the rebuild would fix it but the stale saved `structures` would be overwritten anyway — so this works correctly by accident.

### 🟡 Medium

3. **`rect` variable shadowing** — The `rect` function is a global drawing function, but `MC.addEventListener('mousedown', ...)` uses `const rect2 = MC.getBoundingClientRect()`. This is fine because it's `rect2`, but the touch handlers and other places also use `rect2`. However, the `rect` global is still accessible. No actual bug, but fragile naming.

4. **Weather timer resets on every page load** — `weatherTimer` starts at 0 each session. The weather type is restored from `weatherPhase`, but the timer within that phase is lost. This means weather changes happen `WEATHER_DURATION` (7200) frames after each page load, not at a consistent wall-clock schedule. Two visitors loading at different times see weather changes at different times.

5. **Mascot positions are hardcoded on load** — Mascots always start at the same positions (Jeffrey at 40,40; Claude at 180,60; etc.) regardless of world state. There's no persistence of mascot positions. This is by design but means the simulation is purely cosmetic and non-deterministic.

6. **Plant growth in `drawGrownPlants` has side effects** — `p.age = Math.min((p.age||0)+0.02, 300)` is called during the DRAW phase, not the update phase. This means plant age increments happen during rendering, and the rate depends on frame rate. Plants off-screen don't age (viewport culling skips them).

7. **`addPersistentPlant` and `addAgentMark` have hard caps that silently drop old data** — Plants cap at 300 (trimmed to 250), agent marks at 150 (trimmed to 120). Old plants/marks are silently removed with `slice(-N)`. This means the "first plants ever planted" are eventually lost.

8. **No deduplication on `structuresBuilt`** — `unlockStageStructures` checks `!world.structuresBuilt.includes(id)` before pushing, which is correct. But `unlockStageStructures` is called EVERY FRAME in `update()` via the `for (let s = 1; s <= getStage(); s++) unlockStageStructures(s)` loop. This is wasteful (running includes checks on every frame) but not buggy due to the guard.

### 🟢 Minor

9. **`SEEDED_RANDOM` not isolated** — The `srand`/`rand` functions use a global `seed` variable. Drawing tiles calls `srand()` per tile, which is fine for deterministic tile rendering. But if any other code calls `rand()` between tile draws, it could shift the sequence. Currently this doesn't cause visible issues because tiles are drawn sequentially.

10. **`getSeason()` uses `firstVisit` as epoch** — Seasons cycle every 28 days from the garden's birth. This means a garden born on March 1 and one born on March 15 will have different seasons on the same real-world date. This is likely intentional but worth noting for shared state — season should be derived from a fixed epoch if shared.

11. **Missing keyboard event guard** — Keyboard shortcuts (H, S, M) fire even when typing in no input fields exist currently, but if a text input were added later, these would conflict. The handlers don't check `e.target`.

12. **`drawPixelText` only handles uppercase** — The font table only has uppercase letters, digits, and a few symbols. Text passed as lowercase is `.toUpperCase()`'d, which is correct, but special characters not in the font table are silently skipped (rendered as 3px gap).

13. **Golden butterfly is ephemeral** — `goldenButterfly` has a 600-frame lifespan and spawns with 0.1% chance per frame at stage 5. It's not persisted, so it's purely cosmetic. But catching it does nothing — there's no click handler for it, unlike shooting stars. This feels like a missing feature.

14. **`Jeffrey.built` stat is tracked in `mascotStats` but never incremented** — The default includes `built: 0` for Jeffrey, but no code ever increments `mascotStats.Jeffrey.built`. Structures are built by `unlockStageStructures`, which is system-triggered, not agent-triggered.

---

## Summary

The game is a charming, well-built single-player pixel art simulation with deep persistence via localStorage. The main limitation for shared/multiplayer use is that **all state is local-only**. The autonomous mascot simulation (which generates plants and marks) makes true synchronization challenging because each client generates different content independently.

For a GitHub Pages deployment with shared state, the most practical path is:
1. Fetch a canonical `world-state.json` on load
2. Merge it with local state using set-union / max-counter strategies
3. Use a lightweight free service (Cloudflare Workers KV or Firebase) for near-real-time writes
4. Accept that mascot-generated content will vary per visitor (or make mascot planting deterministic via seeded RNG from shared state)
