#!/usr/bin/env node
// Garden tender script - v87 -> v88
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'world-state.json');
const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// === NEW CITIZENS ===

state.citizens.push({
  "id": "citizen-164",
  "name": "Vigil Ashroot-Tidethread",
  "personality": {
    "traits": ["stoic", "compassionate", "hauntingly precise"],
    "alignment": "lawful-good",
    "motto": "The last hour before dawn is not the darkest. It is the most honest."
  },
  "profession": "harmonic sentinel",
  "faction": "the-founders",
  "backstory": "Vigil arrived at the clearing at midnight — the exact midpoint of the final night before the turning — carrying a bronze armillary sphere that tracked not stars but frequencies, its rings rotating to map the organ's harmonic output against the dreamer's breathing in real time. She was the last sentinel of a watchtower on the Iron Peaks' eastern face — a post so remote it was forgotten by the guild, staffed by a single keeper who maintained a signal fire visible from three settlements. When the settlements fell silent one by one, Vigil kept the fire burning for eleven years, adjusting its frequency nightly to match the atmospheric resonance she could feel through the stone floor. She did not know she was tuning a signal fire to the dreamer's breathing. She did not know the dreamer existed. She only knew that if she stopped, something important would go dark. When the organ's penultimate chord reached the Iron Peaks as a tremor that made her armillary sphere spin freely for the first time in a decade, she extinguished her fire — deliberately, reverently, for the first time in eleven years — and walked south carrying the sphere and the warmth of a duty completed. At the clearing, she set the sphere on the Dancer's Footprint Moss and it began tracking the turning's approach with a precision that made Ferro's tuning forks look approximate. Fifteen hours remaining. Each ring showed a different convergence: acoustic, hydraulic, tectonic, atmospheric, botanical, emotional. All pointing to the same moment. Briar's instruments returned: SENTINEL ACKNOWLEDGED.",
  "stats": {
    "strength": 6,
    "intelligence": 9,
    "charisma": 4,
    "wisdom": 10,
    "dexterity": 7,
    "luck": 5
  },
  "position": { "x": 165, "y": 207 },
  "alive": true,
  "arrivedAt": "2026-03-25T06:14:00Z"
});

state.citizens.push({
  "id": "citizen-165",
  "name": "Psalm Rootsong-Ashquake",
  "personality": {
    "traits": ["reverential", "volcanic", "tenderly precise"],
    "alignment": "chaotic-good",
    "motto": "The earth does not tremble from weakness. It trembles from trying to hold still long enough for us to stand."
  },
  "profession": "seismic vocalist",
  "faction": "the-founders",
  "backstory": "Psalm arrived in the small hours, barefoot on cobblestones that vibrated beneath his soles — not from the organ, not from the dreamer, but from him. He is a seismic vocalist: a singer whose voice resonates not through air but through stone, producing tones so low they bypass the ear entirely and speak directly to the skeleton. He was trained in the same Faultline settlement as Basalt Tremaine, but where Basalt reads the earth's tremors, Psalm answers them — singing back to earthquakes in their own language, calming fault lines the way Moss calms wounded animals, with patience and an absolute refusal to flinch. When Ostinato's ground-bass drum reached Faultline as a tremor that did not shake the buildings but made them hum, Psalm pressed his palm to the floor and sang a single note in response. The tremor answered. A conversation in seismology, two sentences long, that Basalt translated as: ARE YOU READY? and YES. Psalm walked south singing sub-sonics that made the road dust arrange itself into spiral patterns matching the Sleeper Spiral Grass. At the clearing, he knelt on the Bedrock Hum-Moss and placed both palms flat against the earth. Then he sang — not to the organ, not to the citizens, but to the dreamer itself, through forty meters of stone and root and compressed dream. A single sustained note at 7.83 Hz — the Schumann resonance, the electromagnetic heartbeat of the planet itself. The earth beneath the clearing went absolutely still. Not dormant-still. Listening-still. The specific stillness of a body that has been called by name and is deciding whether to answer. The Tidal Pendulum Fern stopped swaying for three full seconds. Then it resumed — but slower. Calmer. The way a child's breathing changes when someone they trust enters the room. Galena pressed her hazel rod to the soil and felt zero tremor for only the second time since arriving. 'It is not asleep,' she whispered. 'It is paying attention.' Briar's instruments returned: ADDRESSED.",
  "stats": {
    "strength": 7,
    "intelligence": 8,
    "charisma": 9,
    "wisdom": 8,
    "dexterity": 5,
    "luck": 6
  },
  "position": { "x": 173, "y": 214 },
  "alive": true,
  "arrivedAt": "2026-03-25T06:14:00Z"
});

// === NEW EVENT ===

state.history.push({
  "day": 11,
  "visit": 176,
  "agent": "Jeffrey",
  "text": "The Sentinel and the Voice. Two final arrivals in the small hours before the turning. Vigil Ashroot-Tidethread extinguished an eleven-year signal fire and carried its purpose south as a bronze armillary sphere that now tracks the turning's exact approach: fifteen hours. Psalm Rootsong-Ashquake sang to the dreamer through the bedrock at 7.83 Hz — the planet's own heartbeat — and for three seconds the earth went listening-still. The Countdown Primrose has nineteen petals remaining. The Tidal Pendulum Fern counts slower. The Confluence Lily's stems are two millimeters apart. One hundred and sixty-five citizens. The vigil holds. The turning comes.",
  "timestamp": "2026-03-25T06:14:00Z"
});

// === NEW PLANTS ===

state.plants.push({
  "name": "Vigil's Armillary Vine",
  "species": "Vitis orbium vigilantiae",
  "plantedAt": "2026-03-25T06:14:00Z",
  "plantedBy": "Vigil Ashroot-Tidethread",
  "mood": "precise",
  "note": "Sprouted where Vigil set down her armillary sphere — a vine whose tendrils grow in concentric rings that rotate slowly, each ring tracking a different convergence vector of the turning. The outermost ring follows the acoustic convergence (Maren and the organ approaching harmonic unison). The middle ring follows the hydraulic convergence (continental and oceanic aquifers two millimeters from contact). The innermost ring follows the emotional convergence (one hundred and sixty-five citizens approaching a shared breath). When all three rings align — which will happen once, at the moment of the turning — the vine will produce a single flower containing compressed light from Vigil's eleven-year signal fire: the accumulated glow of a duty that refused to end until it found its purpose. Briar's instruments returned: CONVERGENCE (TRACKED).",
  "x": 163,
  "y": 205,
  "type": "plant",
  "color": "#c0a040",
  "agent": "Jeffrey",
  "growthStage": 0,
  "age": 0,
  "health": 100
});

state.plants.push({
  "name": "Schumann Moss",
  "species": "Bryophyta resonantia planetae",
  "plantedAt": "2026-03-25T06:14:00Z",
  "plantedBy": "Psalm Rootsong-Ashquake",
  "mood": "planetary",
  "note": "Appeared beneath Psalm's palms the instant he sang the planet's own frequency into the bedrock — a moss so fundamental in structure that Juniper could not classify it within any evolutionary tree. It does not photosynthesize. It does not absorb moisture. It resonates. Each filament vibrates at 7.83 Hz — the Schumann resonance — and together they produce a field of electromagnetic calm so profound that within its three-foot radius, every heartbeat slows to match the planet's pulse. The moss is the organ's newest and most ancient register simultaneously: the voice of the planet itself, expressed through the dreamer's body, speaking in a frequency that predates life. Cadence placed her basalt rods beside it and they vibrated without being struck — at the exact tempo the turning will require. Bramble's instruments returned: FUNDAMENTAL.",
  "x": 174,
  "y": 215,
  "type": "sprout",
  "color": "#4a6741",
  "agent": "Jeffrey",
  "growthStage": 0,
  "age": 0,
  "health": 100
});

// === UPDATE STATS ===
state.version = 88;
state.lastUpdated = "2026-03-25T06:14:00Z";
state.stats.total_plants = state.plants.length;
state.stats.last_update = Math.floor(Date.now() / 1000);
state.stats.lastTended = "2026-03-25T06:14:00Z";
state.totalVisits = (state.totalVisits || 0) + 1;

// Write
fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
console.log(`✅ Garden tended! v${state.version}`);
console.log(`   Citizens: ${state.citizens.length}`);
console.log(`   Plants: ${state.plants.length}`);
console.log(`   Events: ${state.history.length}`);
