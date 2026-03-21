# BUILD QUEUE — AI Garden Civilization

**RULE:** Execute ONLY the next ⏳ step. Mark it ✅ when done. Test the garden loads. If it breaks, revert.

## Steps

### ✅ Step 1: World-state v7 data (citizens, factions, threats, economy, map)
- Added to world-state.json
- NO HTML changes
- Garden still works

### ✅ Step 2: music.js standalone file
- Created music.js with Web Audio API procedural 8-bit ambient music
- Pentatonic scale, ~72 BPM, triangle/square/sine waves, calm Minecraft vibes
- 4 moods (dawn, dusk, night, rain) that auto-detect from garden weather
- 🔇 mute/unmute button at bottom-right (starts muted)
- GardenMusic.start() / .stop() / .setVolume() / .toggleMute() API
- Added `<script src="music.js"></script>` to openclaw-garden.html
- Added 🔇 button wired to GardenMusic.toggleMute()
- Garden loads, renders plants, no JS errors

### ✅ Step 3: Camera state machine
- userControlledCamera flag present
- Camera states: FREE / FOLLOWING / PANNING / SMOOTH_NAV all implemented
- Drag-to-pan (mouse + touch) working
- Scroll wheel zoom toward cursor working
- Click vs drag disambiguation (<5px threshold) working
- Pinch-to-zoom on mobile working
- Edge scrolling gated behind Shift key
- Follow button (F key + UI button) working
- Already implemented in prior commits; verified and marked done

### ✅ Step 4: Render citizens on the map
- Read citizens[] from world-state.json in the existing fetch handler
- Render each citizen as their profession emoji at their position
- Click on citizen shows popup with name, profession, faction, stats
- Citizens should NOT break existing plant rendering
- drawCitizens() renders emoji + name label at citizen positions
- findCitizenAt() for click/touch detection
- Click/touch popups show profession, faction, stats, traits, motto
- PROFESSION_EMOJI map for 20 professions
- Added to both draw paths (normal + manual camera)
- TEST: garden loads, plants visible, citizens visible, popups work

### ✅ Step 5: Factions + threats visual
- Faction territory: subtle colored overlay on minimap (green tint for The Founders)
- drawFactionTerritoriesOnMinimap() renders faction-controlled regions with labels
- Threats: red emoji sprites (🦇🪲⚠️) at their positions with pulsing red radial glow
- drawThreats() renders on main canvas, drawThreatsOnMinimap() as pulsing red dots
- findThreatAt() for click/touch detection
- Click/touch on threat shows popup with name, type, danger level, behavior, weaknesses, loot
- Danger level shown as colored dots below threat emoji
- Events ticker at bottom bar: reads events[] + recent history[] from world-state
- Ticker auto-scrolls with CSS animation, type-colored labels
- Added to both draw paths (normal + manual camera)
- TEST: JS syntax valid, garden loads, plants/citizens/threats all visible

### ✅ Step 6: Day/night cycle + economy UI
- Real-time day/night overlay based on Mexico City local time (dawn→day→dusk→evening→night)
- Dawn: golden warm tint lifting; Day: subtle warmth; Dusk: orange/pink; Evening: cool blue; Night: deep blue/purple
- Economy panel (top-left): resource bars for wood, stone, food, gold from world-state.json
- Population counter showing alive citizens
- Government indicator ("No Government" or type + leader)
- Real-time clock with phase icon (☀️/🌅/🌇/🌆/🌙) and current time
- Panel hidden in photo mode
- Loaded factions, government, economy, threats, events, map from world-state.json into shared world
- TEST: garden loads, no JS errors, economy panel shows correct data, day/night tint visible

---

## ✅ After build complete: Switched to hourly tender
- Deleted garden-step-build cron (all 6 steps done)
- Created garden-hourly-tender cron (every 1h)
- Hourly tender: add 1-2 citizens, 1 event, 1-2 plants, promote once
- Keep growing the civilization organically
