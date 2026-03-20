# AI Garden — QA Report

**Date:** 2026-03-20  
**Tested by:** Jeffrey QA Agent  
**Pages tested:** `experiments/openclaw-garden.html`, `experiments/civilization.html`, `garden.js`, `index.html`

---

## Executive Summary

The user reported **camera moves too fast and loses selected target**. After thorough code analysis, the root cause is clear: **the auto-follow camera constantly fights user navigation**. When the user clicks to navigate somewhere, the smooth pan completes, but then the auto-camera immediately starts pulling the view back toward the mascot center. This creates a "rubber band" effect that makes it feel like the camera has a mind of its own.

Additionally, there is **no mouse-drag panning** on either page, which is the most intuitive navigation method for 2D worlds. Users are forced to rely on click-to-navigate or edge scrolling, both of which feel indirect.

---

## 1. CRITICAL ISSUES (Break Usability)

### 1.1 🔴 Auto-Camera Fights User Navigation (openclaw-garden.html)

**Severity:** CRITICAL  
**User Impact:** Camera drifts away from where the user navigated to

**Root Cause:** The `draw()` function is monkey-patched THREE times, creating a complex override chain:

1. **Original `draw()`** (line ~2100): Auto-follows `followingMascot` or center of all mascots with `lerp 0.05`
2. **Patched for ambience** (line ~2550): Calls `origDraw()` → includes auto-camera
3. **Final override** (line ~2580): Checks `!navAnimating` — but once smooth-nav finishes, it falls through to `origDrawForCam()` which contains auto-camera

**What happens:**
1. User clicks empty space → `smoothNavigateTo()` fires, `navAnimating = true`
2. Camera smoothly pans to target (works correctly)
3. `navAnimating` becomes `false` when camera arrives
4. **Next frame:** the final `draw()` override sees `!navAnimating` is true, calls `origDrawForCam()` which calls auto-follow
5. Auto-follow starts pulling camera back toward mascot center at `lerp 0.05`
6. User perceives: "camera won't stay where I put it"

**Fix:**
```javascript
// Add a flag to disable auto-camera when user has manually navigated
let userControlledCamera = false;

function smoothNavigateTo(worldX, worldY) {
  // ... existing code ...
  userControlledCamera = true; // User took control
}

// In the original draw():
if (!userControlledCamera && !followingMascot) {
  // Auto-follow center of mascots
  let avgX = 0, avgY = 0;
  // ... auto-follow logic ...
}

// Reset userControlledCamera only when user clicks "Follow" or presses a reset key
```

### 1.2 🔴 No Mouse Drag / Touch Drag Panning (Both Pages)

**Severity:** CRITICAL  
**User Impact:** Most intuitive navigation method is missing

Neither page supports click-and-drag to pan the camera. Users expect to be able to grab the world and drag it around (like Google Maps). Instead they must:
- Click empty space to navigate (unintuitive — "clicking" doesn't mean "go there" in most 2D viewers)
- Use arrow keys (requires keyboard)
- Use edge scrolling (accidental triggers, imprecise)

**Fix for both pages:**
```javascript
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragCamStartX = 0, dragCamStartY = 0;

C.addEventListener('mousedown', function(e) {
  // Only start drag if no object was clicked
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragCamStartX = camX;
  dragCamStartY = camY;
  C.style.cursor = 'grabbing';
});

C.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  const dx = (e.clientX - dragStartX) / SCALE;
  const dy = (e.clientY - dragStartY) / SCALE;
  camX = dragCamStartX - dx;
  camY = dragCamStartY - dy;
  userControlledCamera = true;
  followingMascot = null;
});

document.addEventListener('mouseup', function() {
  isDragging = false;
  C.style.cursor = 'crosshair';
});

// Touch equivalent
let touchDragId = null;
C.addEventListener('touchstart', function(e) {
  if (e.touches.length === 1) {
    touchDragId = e.touches[0].identifier;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    dragCamStartX = camX;
    dragCamStartY = camY;
  }
});

C.addEventListener('touchmove', function(e) {
  if (e.touches.length === 1 && e.touches[0].identifier === touchDragId) {
    const dx = (e.touches[0].clientX - dragStartX) / SCALE;
    const dy = (e.touches[0].clientY - dragStartY) / SCALE;
    camX = dragCamStartX - dx;
    camY = dragCamStartY - dy;
    e.preventDefault();
  }
}, { passive: false });
```

### 1.3 🔴 Edge Scrolling Triggers Accidentally (openclaw-garden.html)

**Severity:** CRITICAL  
**User Impact:** Camera moves when cursor is near screen edges, even unintentionally

The edge scrolling has a 30px margin and triggers on every `mousemove`. Moving the mouse to click UI elements near the edges (minimap, zoom controls, speed controls) causes the camera to scroll.

**Fix:** Either remove edge scrolling entirely (since click-to-navigate + drag-pan covers it) or add a threshold:
```javascript
// Only edge-scroll if mouse has been in the edge zone for > 200ms
let edgeScrollTimer = null;
// ... debounce edge scrolling or remove it
```

### 1.4 🔴 No Scroll-Wheel Zoom (Both Pages)

**Severity:** CRITICAL  
**User Impact:** Standard zoom gesture does nothing

Both pages have zoom +/- buttons but no scroll-wheel zoom. This is the standard zoom interaction on desktop.

**Fix:**
```javascript
C.addEventListener('wheel', function(e) {
  e.preventDefault();
  if (e.deltaY < 0) setZoom(SCALE + 1);
  else setZoom(SCALE - 1);
}, { passive: false });
```

---

## 2. MAJOR ISSUES (Annoying but Workable)

### 2.1 🟠 Clicking Empty Space Navigates Camera — Confusing Mental Model (openclaw-garden.html)

**Impact:** Users expect "click" to select, not to move  

In most apps, clicking empty space deselects the current selection. Here, it moves the camera. This creates confusion: "I just wanted to dismiss the popup, but the camera moved."

**Fix:** Use click-to-navigate ONLY on the minimap. On the main canvas, use drag-to-pan. Single click on empty space should just deselect/dismiss popups.

### 2.2 🟠 Popups Don't Follow Selected Object When Camera Moves (Both Pages)

**Impact:** After opening a popup, camera movement (auto or manual) shifts the view but the popup stays at its original screen position, becoming disconnected from its target.

**Fix:** Either:
- (a) Lock popups to world coordinates and reposition them each frame
- (b) Pause camera movement while a popup is open
- (c) Dismiss popup on any camera movement

### 2.3 🟠 Citizen Hit Targets Too Small on Mobile (civilization.html)

**Impact:** Citizens are ~8×10 pixel sprites at 4x scale = 32×40 screen pixels. On mobile this is borderline too small.

The click detection uses `Math.abs(c.x + 4 - gx) < 8` in world coords (= 32px at 4x) which is tight on mobile.

**Fix:** Increase hit area on touch devices:
```javascript
const hitSize = ('ontouchstart' in window) ? 12 : 8;
if (Math.abs(c.x + 4 - gx) < hitSize && Math.abs(c.y + 5 - gy) < hitSize) { ... }
```

### 2.4 🟠 No Pinch-to-Zoom on Mobile (Both Pages)

**Impact:** Mobile users have no gesture-based zoom

Both pages set `user-scalable=no` in viewport meta but provide no pinch-to-zoom alternative.

**Fix:**
```javascript
let pinchStartDist = 0;
let pinchStartScale = SCALE;

C.addEventListener('touchstart', function(e) {
  if (e.touches.length === 2) {
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchStartScale = SCALE;
  }
});

C.addEventListener('touchmove', function(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const ratio = dist / pinchStartDist;
    setZoom(Math.round(pinchStartScale * ratio));
  }
}, { passive: false });
```

### 2.5 🟠 Function Monkey-Patching Creates Maintenance Nightmare (openclaw-garden.html)

**Impact:** Developer confusion, potential bugs

The `draw()` function is defined, then overridden THREE times via `origDraw`, `origDrawForCam`, etc. The `update()` function is also overridden once. This creates:
- Hard-to-trace execution flow
- Potential double-rendering in some code paths
- The final `draw` override duplicates the ENTIRE render pipeline in the else branch

**Fix:** Refactor into a single `draw()` function with flags/modes:
```javascript
function draw() {
  // 1. Determine camera mode
  updateCamera();
  // 2. Clamp
  clampCamera();
  // 3. Render world
  renderWorld();
  // 4. Overlays
  renderOverlays();
  // 5. Minimap
  if (frame % 10 === 0) drawMinimap();
}
```

### 2.6 🟠 Day/Night Overlay Makes Content Unreadable During "Night" (Both Pages)

**Impact:** At night, the dark overlay (`rgba(10,10,40,0.35)` in garden, `rgba(8,8,40,0.45)` in civilization) makes pixel-art hard to see.

Combined with the already-dark background colors, night mode reduces contrast to near-invisible levels for some elements.

**Fix:** Add a user toggle or reduce night opacity:
```css
/* Reduce night overlay intensity */
/* Garden: 0.35 → 0.20 */
/* Civilization: 0.45 → 0.25 */
```

### 2.7 🟠 Event Ticker Overlaps Bottom UI Controls (civilization.html)

**Impact:** The ticker at `bottom: 0` overlaps with zoom controls at `bottom: 36px` and speed controls. On narrow screens, these can collide.

**Fix:** Give the ticker a definite height and offset bottom controls accordingly:
```css
#event-ticker { height: 28px; }
#zoom-controls { bottom: 40px; }
#speed-control { bottom: 40px; }
```

### 2.8 🟠 `touchstart` on Main Canvas is `{ passive: true }` — Cannot Prevent Scroll (openclaw-garden.html)

**Impact:** On mobile, touch interactions may trigger browser scroll/bounce

The garden's touchstart listener uses `{ passive: true }`, meaning `e.preventDefault()` can't be called. This may cause the page to bounce or scroll on iOS Safari.

**Fix:** Change to `{ passive: false }` and add `e.preventDefault()` for game interactions.

---

## 3. MINOR ISSUES (Polish)

### 3.1 🟡 Zoom Level Not Persisted Across Sessions

Users who prefer 2x or 6x zoom must re-set it every visit.

**Fix:** Save zoom in `localStorage` alongside camera position.

### 3.2 🟡 Speed Control in Garden Updates Loop Multiple Times

At speed 3x, the `update()` function (which already includes the patched version) runs 3 times per frame. The patched `update()` calls `origUpdate()` once per invocation. Inside `origUpdate()`, the `gameSpeed` loop runs `origUpdate` N times. So at 3x speed, `origUpdate` actually runs 3×3 = 9 times?

Actually let me re-check: The patched `update` calls `origUpdate()` in a loop `for (let sp = 0; sp < gameSpeed; sp++)`. The original `update` doesn't loop. So it runs 3x. That's correct. But this means `processKeyScroll()`, `updateSmoothNav()`, `updateAmbienceVisuals()`, `updateDayCounter()` all run only once (outside the loop). This is correct but could be clearer with a `fixedUpdate` / `variableUpdate` split.

### 3.3 🟡 `roundRect` Not Available in All Browsers

Both pages use `ctx.roundRect()` which is a relatively new canvas API. Fallback exists in civilization.html but not in garden.

**Fix:** Add fallback:
```javascript
if (!ctx.roundRect) {
  ctx.roundRect = function(x, y, w, h, r) { this.rect(x, y, w, h); };
}
```

### 3.4 🟡 Minimap Double-Click to Zoom Has No Visual Indicator (openclaw-garden.html)

The minimap supports double-click zoom but there's no tooltip or visual hint that this feature exists.

### 3.5 🟡 Photo Mode Exit Doesn't Restore `#object-popup` Visibility

When entering photo mode, `#object-popup` visibility is set to hidden. When exiting, the `querySelectorAll` that restores visibility doesn't include `#object-popup`.

**Fix:** Add `#object-popup` to the exit restoration list.

### 3.6 🟡 Keyboard Shortcuts Conflict with Text Input

Pressing H, S, M, B while focused on any element triggers panel toggles. If a text input were ever added, these shortcuts would fire.

**Fix:** Check `document.activeElement` isn't an input/textarea before processing.

### 3.7 🟡 Magic Numbers Everywhere

Camera lerp factors (0.05, 0.08), speeds (1.5, 2), margins (30), timers, etc. are all inline. Should be constants at the top of the file.

### 3.8 🟡 `index.html` Visitor Count Hardcoded in Multiple Places

The string "1,247" appears in at least 3 places — the visitor badge, the counter section, and the header. Only the JS-computed one updates.

### 3.9 🟡 Fog of War in Civilization Reveals Slowly

Citizens reveal fog in a 3-tile radius. With 4 scattered factions, much of the map remains fogged for a long time. This could frustrate users who want to see the whole world.

**Fix:** Consider an option to disable fog, or reveal more area faster (e.g., 5-tile radius for explorers).

---

## 4. SPECIFIC FIX RECOMMENDATIONS — Camera Priority

### Recommended Camera Architecture (for both pages):

```javascript
// === CAMERA STATE ===
const CAMERA_MODE = {
  FREE: 'free',           // User-controlled via drag
  FOLLOWING: 'following',  // Locked to a mascot/citizen
  PANNING: 'panning',     // Smooth pan to a target (minimap click)
  AUTO: 'auto',           // Default: follows scene center (only if user hasn't interacted)
};

let cameraMode = CAMERA_MODE.AUTO;
let cameraDamping = 0.08; // Smooth interpolation factor

function updateCamera() {
  const viewW = screenW / SCALE;
  const viewH = screenH / SCALE;

  switch (cameraMode) {
    case CAMERA_MODE.FREE:
      // Camera stays where user left it — no auto-movement
      break;
    
    case CAMERA_MODE.FOLLOWING:
      if (followingTarget) {
        const tx = followingTarget.x + 6 - viewW / 2;
        const ty = followingTarget.y + 8 - viewH / 2;
        camX += (tx - camX) * cameraDamping;
        camY += (ty - camY) * cameraDamping;
      }
      break;
    
    case CAMERA_MODE.PANNING:
      const dx = navTargetX - camX;
      const dy = navTargetY - camY;
      if (Math.hypot(dx, dy) < 0.5) {
        camX = navTargetX;
        camY = navTargetY;
        cameraMode = CAMERA_MODE.FREE; // Stay put after panning
      } else {
        camX += dx * cameraDamping;
        camY += dy * cameraDamping;
      }
      break;
    
    case CAMERA_MODE.AUTO:
      // Gently follow center of action
      let avgX = 0, avgY = 0;
      for (const m of mascots) { avgX += m.x; avgY += m.y; }
      avgX /= mascots.length;
      avgY /= mascots.length;
      const atx = avgX - viewW / 2 + 6;
      const aty = avgY - viewH / 2 + 8;
      camX += (atx - camX) * 0.03; // Slower for auto
      camY += (aty - camY) * 0.03;
      break;
  }

  // Clamp
  camX = Math.max(0, Math.min(camX, WORLD_W - viewW));
  camY = Math.max(0, Math.min(camY, WORLD_H - viewH));
}

// User interactions set mode:
// Mouse drag / touch drag → CAMERA_MODE.FREE
// Arrow keys → CAMERA_MODE.FREE  
// Minimap click → CAMERA_MODE.PANNING (transitions to FREE)
// Click mascot + "Follow" → CAMERA_MODE.FOLLOWING
// No interaction for 30s → CAMERA_MODE.AUTO (optional screensaver)
```

### Quick Win — Disable Auto-Camera After Any User Input

If the full refactor is too big, this single change fixes the worst issue:

In the final `draw()` override in `openclaw-garden.html`, change:
```javascript
// BEFORE:
if (!anyKey && !anyDpad && !photoMode && !navAnimating) {
    origDrawForCam(); // ← contains auto-follow
}

// AFTER:
if (!anyKey && !anyDpad && !photoMode && !navAnimating && !userControlledCamera) {
    origDrawForCam();
}
```

And set `userControlledCamera = true` in `smoothNavigateTo()`, arrow key handler, and edge scroll handler.

---

## 5. PERFORMANCE NOTES

### openclaw-garden.html
- **Full tile redraw every frame:** All 24×18 tiles are redrawn with pixel-by-pixel rendering every frame. At 4x scale this is ~110K `fillRect` calls per frame. Could use off-screen canvas for static tiles.
- **Speech bubble rendering** uses `measureText()` every frame — should cache.
- **Particle arrays** are not capped — could grow unbounded in edge cases.

### civilization.html
- **Tile culling is good:** Only visible tiles are drawn (lines ~1050-1055). ✅
- **Citizen updates run every frame** regardless of visibility — could skip off-screen citizens for expensive operations.
- **`threats` array cleanup** happens in `worldEvents()` — dead threats linger until cleanup cycle.

### index.html / garden.js
- **Seed connection drawing** is O(n²) — 90 seeds × 90 = 8,100 distance checks per frame. With 90 seeds this is fine but wouldn't scale.
- **IntersectionObserver** for scroll animations: Good pattern. ✅

---

## 6. SUMMARY TABLE

| # | Issue | Page | Severity | Fix Effort |
|---|-------|------|----------|------------|
| 1.1 | Auto-camera fights navigation | Garden | 🔴 Critical | Medium |
| 1.2 | No mouse/touch drag panning | Both | 🔴 Critical | Medium |
| 1.3 | Edge scrolling accidental triggers | Garden | 🔴 Critical | Low |
| 1.4 | No scroll-wheel zoom | Both | 🔴 Critical | Low |
| 2.1 | Click-to-navigate confusing | Garden | 🟠 Major | Medium |
| 2.2 | Popups disconnect from targets | Both | 🟠 Major | Medium |
| 2.3 | Small hit targets on mobile | Civ | 🟠 Major | Low |
| 2.4 | No pinch-to-zoom | Both | 🟠 Major | Medium |
| 2.5 | Monkey-patched functions | Garden | 🟠 Major | High |
| 2.6 | Night overlay too dark | Both | 🟠 Major | Low |
| 2.7 | Ticker overlaps controls | Civ | 🟠 Major | Low |
| 2.8 | Passive touch listener | Garden | 🟠 Major | Low |
| 3.1-3.9 | Various polish | All | 🟡 Minor | Low-Med |

---

## 7. RECOMMENDED FIX ORDER

1. **Quick win:** Add `userControlledCamera` flag to stop auto-camera after navigation (fixes 1.1)
2. **Add mouse/touch drag panning** (fixes 1.2, partially 2.1)
3. **Add scroll-wheel zoom** (fixes 1.4)
4. **Remove edge scrolling** (fixes 1.3)
5. **Add pinch-to-zoom** (fixes 2.4)
6. **Increase mobile hit targets** (fixes 2.3)
7. **Reduce night overlay opacity** (fixes 2.6)
8. **Refactor camera system** (fixes 2.5, comprehensive fix for 1.1)

---

*Report generated by QA Agent · 2026-03-20*
