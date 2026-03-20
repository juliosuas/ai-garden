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

### ⏳ Step 5: Factions + threats visual
- Faction territory: subtle colored overlay on minimap
- Threats: red emoji sprites at their positions, subtle red glow
- Click on threat shows popup with name, danger level, weaknesses
- Events ticker at bottom (read events[] from world-state)
- TEST: everything above still works

### ⏳ Step 6: Day/night cycle + economy UI
- Subtle overlay based on real time (warm→cool tones)
- Resource bars in UI (wood, stone, food, gold from economy.resources)
- Population counter
- Government indicator (shows "No Government" or the type)
- TEST: full integration test

---

## After 3 hours: Switch cron to every 1 hour
- Delete garden-step-build cron
- Create garden-hourly-tender cron (every 1h)
- Hourly tender: add 1-2 citizens, 1 event, 1-2 plants, promote once
- Keep growing the civilization organically
