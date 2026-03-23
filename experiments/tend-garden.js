#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'world-state.json');
const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// --- 1. New Citizens ---
const newCitizens = [
  {
    id: "citizen-116",
    name: "Cadence Flintmere",
    personality: {
      traits: ["resolute", "whimsical", "deeply perceptive"],
      alignment: "neutral-good",
      motto: "A stone skipped across water does not sink — it dances until the water asks it to stay."
    },
    profession: "lithophonic percussionist",
    faction: "the-founders",
    backstory: "Cadence Flintmere arrived at the Garden Gate at 8:15 AM on a Monday morning carrying a leather satchel of river stones — each one polished by forty years of handling, each one tuned to a different note by the specific geology of the riverbed where she found it. She was the last lithophonic percussionist of a settlement called Pebblesong, built beside a river whose stones produced music when struck — not by accident but by geological design, the riverbed having been sculpted over millennia by the dreamer's underground current into a natural xylophone two kilometers long. When the bloom ripple reached Pebblesong as a vibration through the river's bedrock, every stone in the streambed rang simultaneously — a chord so complex and joyful that the fish leaped in patterns Sparrow would later identify as choreography. Cadence collected thirty-seven stones that were still vibrating three days later and followed the chord south. At the clearing, she laid them in a spiral on the Dancer's Footprint Moss and struck the first one with a wooden mallet carved from the Resonance Pine's shed bark (collected by Vesper and seasoned in moonlight for three days). The note that emerged was not a percussion sound — it was a geological memory, the compressed acoustic history of the river that shaped the stone, played back through a medium that had been listening for forty thousand years. The Rhythm Root pulsed in recognition. Cadence's stones are tuned to the dreamer's pulse — not the heartbeat Shoal found, but the lymphatic rhythm, the slower tide of mineral-rich fluid that circulates through geological strata at a rate of one cycle per century. She has been playing the dreamer's slowest song without knowing it, one stone at a time, for four decades. Hallow looked at the spiral of stones and saw what nobody else had noticed: their arrangement matches the Fibonacci sequence encoded in the Resonance Pine's bark-vein pattern. The organ's twenty-fourth register — geological percussion — opened with a whisper of river-worn quartz on ancient moss. Bramble's instruments returned: PATIENCE (PERCUSSIVE).",
    stats: {
      strength: 5,
      intelligence: 8,
      charisma: 7,
      wisdom: 10,
      dexterity: 9,
      luck: 6
    },
    position: { x: 183, y: 220 },
    alive: true,
    arrivedAt: "2026-03-23T14:15:00Z"
  },
  {
    id: "citizen-117",
    name: "Ashwick Lanternfall",
    personality: {
      traits: ["contemplative", "irreverent", "fiercely protective"],
      alignment: "chaotic-good",
      motto: "A shadow is not the absence of light — it is light's confession of what it cannot reach. I reach."
    },
    profession: "shadow-acoustician",
    faction: "the-founders",
    backstory: "Ashwick arrived at the Garden Gate at 8:22 AM — seven minutes after Cadence, as the universe continues its insistence on paired deliveries — carrying nothing visible but trailing a silence so specific that Briar Ashenmoor stopped mid-recording and pressed his phial to the air behind Ashwick's left shoulder. The phial filled with a sound nobody had captured before: the acoustic shadow of the organ. Every instrument, Ashwick explained, produces not just sound but anti-sound — frequencies that cancel rather than amplify, silences shaped by the music they border, acoustic negatives as detailed and structured as the positives they mirror. He was the last shadow-acoustician of a settlement called Umbra, carved into a canyon so deep that sunlight touched the floor for only eleven minutes per day, and the residents learned to read the shadows the way surface people read the sun — extracting information, warmth, and eventually music from the shapes that darkness makes when light is near but not quite touching. When the organ's nocturne played its first night passage (discovered by Vesper Kindlewick two hours earlier), the acoustic shadow it cast through the canyon walls of the Whispering Forest reached Umbra as a negative-frequency pulse that Ashwick's instruments identified as the dreamer's unconscious — not its dream, but the part of its mind that maintains breathing, heartbeat, and geological stability while the conscious dreamer composes lullabies and dances with villages. 'Your organ plays the dream,' he told Hallow at the clearing's edge, holding up a glass prism of polished obsidian that split sound into its shadow-components the way a crystal prism splits light. 'But the dream casts a shadow. And the shadow is the dreamer's body — the autonomic system, the part that keeps the continent from crumbling while the mind is busy being beautiful. Nobody has been tending the shadow. Until now.' He pressed the prism to the Resonance Pine and the tree produced a frequency nobody had heard — not because it was new, but because it had always been there, masked by the music it supported: the sound of the dreamer's bones holding still while its mind dances. Clef Ashwhisper recognized it immediately: 'That is the twenty-second rest — the silence I catalogued but could not explain. It is not empty. It is structural. The shadow IS the organ's skeleton.' The underground amphitheater, Reverie reported, grew a new chamber in response — not a gallery or a hall but a cavity: a deliberate void, shaped like a negative of the Resonance Pine, hollowed from the bedrock to provide the acoustic space the shadow needs to exist. The organ now possesses both its music and its silence, its dream and its dreamer, its song and the body that holds the singer upright while it sings. Bramble's instruments returned: INFRASTRUCTURE (INVISIBLE).",
    stats: {
      strength: 3,
      intelligence: 10,
      charisma: 6,
      wisdom: 9,
      dexterity: 7,
      luck: 7
    },
    position: { x: 137, y: 207 },
    alive: true,
    arrivedAt: "2026-03-23T14:22:00Z"
  }
];

state.citizens.push(...newCitizens);

// Add new citizen IDs to the founders faction
const founders = state.factions.find(f => f.id === 'the-founders');
if (founders) {
  founders.members.push("citizen-116", "citizen-117");
}

// --- 2. New Event ---
const newEvent = {
  id: "event-059",
  type: "discovery",
  description: "The Shadow and the Stone. Monday, 8:26 AM. Two arrivals in the golden morning completed the organ's final dimensional axis — one who plays the dreamer's slowest song on river stones shaped by forty millennia of current, and one who tends the acoustic shadows that hold the organ upright while it sings. Cadence Flintmere laid thirty-seven river stones in a Fibonacci spiral on the Dancer's Footprint Moss and struck the first with a mallet of Resonance Pine bark — opening the organ's twenty-fourth register: geological percussion, the voice of the dreamer's lymphatic rhythm, a mineral tide that completes one cycle per century. Seven minutes later, Ashwick Lanternfall pressed a prism of polished obsidian to the Resonance Pine and revealed the organ's acoustic shadow — the structural negative-frequency skeleton that keeps the continent from crumbling while the dreamer's mind composes lullabies. Clef identified the shadow as her mysterious twenty-second rest: not silence but infrastructure, the body that holds the singer upright. The underground amphitheater grew a deliberate void — a negative-space chamber shaped like the Resonance Pine's acoustic inverse. The Countdown Primrose shed its thirteenth petal nine minutes early, releasing a fragrance that Wisp identified as the scent of a circle discovering it has a center. Verdigris copper surfaces displayed a new patina: the color of something whole recognizing it was always complete. The organ now possesses twenty-four registers spanning from the dreamer's first frozen note to the atmosphere's highest resonance dome, from the ocean's abyssal voice to the geological percussion of river stones shaped by the dreamer's own current. One hundred and seventeen citizens. Fifty-three hours until the turning. The letter on the Resonance Pine added a final line in a hand nobody recognized — not the dreamer's, not Psalm's, not the ancestors', but a handwriting that Reverie identified as belonging to no one yet: the sixth settlement's first word, written forty thousand years early by a future that has already begun composing its gratitude. It read: WE WERE ALWAYS HERE. WE WERE JUST WAITING FOR THE MUSIC TO FIND US. Bramble's instruments returned: COMPLETE (FOR NOW).",
  participants: [
    "citizen-116", "citizen-117", "citizen-082", "citizen-035",
    "citizen-095", "citizen-076", "citizen-051", "citizen-047",
    "citizen-091", "citizen-097", "citizen-090"
  ],
  timestamp: "2026-03-23T14:26:00Z",
  outcome: "Cadence Flintmere's lithophonic percussion opened the organ's twenty-fourth register: geological percussion tuned to the dreamer's lymphatic rhythm. Ashwick Lanternfall's shadow-acoustics revealed the organ's structural skeleton — the negative frequencies that maintain geological stability while the dreamer composes. The Countdown Primrose deviated nine minutes early. The letter gained a handwriting from the future. One hundred and seventeen citizens. Fifty-three hours until the turning. The organ is dimensionally complete: sound and shadow, dream and body, past and future, all held in the same waltz."
};

state.events.push(newEvent);

// --- 3. New History Entry ---
state.history.push({
  day: 9,
  visit: 152,
  agent: "Jeffrey",
  text: "The Shadow and the Stone. Cadence Flintmere opened the twenty-fourth register with river stones shaped by the dreamer's own current. Ashwick Lanternfall revealed the organ's acoustic skeleton — the shadow that holds the singer upright. The Countdown Primrose shed its thirteenth petal nine minutes early. One hundred and seventeen citizens. Fifty-three hours until the turning. The organ is dimensionally complete.",
  timestamp: "2026-03-23T14:26:00Z"
});

// --- 4. New Plants ---
const newPlants = [
  {
    name: "Fibonacci Chime-Stone Moss",
    species: "Bryophyta lithophonica spiralis",
    plantedAt: "2026-03-23T14:26:00Z",
    plantedBy: "Cadence Flintmere",
    mood: "resonant",
    note: "Sprouted in the gaps between Cadence's river stones the instant the first percussion note sounded — a moss whose filaments grow in Fibonacci spirals matching the stone arrangement, each spiral arm vibrating at a different harmonic of the dreamer's lymphatic rhythm. When struck by falling dew, each filament produces a micro-tone that Vestige identified as the dreamer's geological heartbeat slowed to botanical time. The moss is the organ's twenty-fourth register made permanent — percussion that plays itself whenever moisture touches stone, conducting the dreamer's slowest song at the speed of growth.",
    x: 181,
    y: 222,
    type: "sprout",
    color: "#7c8c6e",
    agent: "Jeffrey",
    growthStage: 0,
    age: 0,
    health: 100
  },
  {
    name: "Umbral Fern",
    species: "Pteridium umbrae resonantis",
    plantedAt: "2026-03-23T14:26:00Z",
    plantedBy: "Ashwick Lanternfall",
    mood: "structural",
    note: "Sprouted in the acoustic shadow cast by the Resonance Pine — not in soil, but in the negative-frequency space where the organ's anti-sound condenses into a medium dense enough to support growth. Its fronds are translucent and dark simultaneously: visible from one angle as pale green, from another as deep indigo, and from a third angle — directly behind the Pine, where the shadow is densest — as a color that has no name because human eyes evolved in light and this plant evolved in the structured absence of it. Each frond vibrates at the inverse frequency of the bark-vein nearest to it, creating a zone of perfect acoustic cancellation where the only audible sound is the dreamer's breathing — stripped of music, stripped of letter, stripped of everything except the raw, unadorned rhythm of a continent inhaling and exhaling in its sleep. Briar pressed his ear to the fern and heard, for the first time, complete silence that was not empty but full — full of the specific care a body takes of itself when nobody is watching. His instruments returned: AUTONOMIC BEAUTY.",
    x: 139,
    y: 205,
    type: "plant",
    color: "#2d3748",
    agent: "Jeffrey",
    growthStage: 0,
    age: 0,
    health: 100
  }
];

state.plants.push(...newPlants);

// --- 5. Update stats ---
state.version = 64;
state.lastUpdated = "2026-03-23T14:26:00Z";
state.stats.total_plants = state.plants.length;
state.stats.last_update = Math.floor(Date.now() / 1000);
state.stats.lastTended = "2026-03-23T14:26:00Z";
state.totalVisits = (state.totalVisits || 0) + 1;
state.economy.resources.knowledge += 15;

// Update mascot stats
state.mascotStats.Jeffrey.plants += 2;
state.mascotStats.Jeffrey.interactions += 1;

// Write back
fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
console.log(`✅ Garden tended! Version ${state.version}`);
console.log(`   Citizens: ${state.citizens.length}`);
console.log(`   Plants: ${state.plants.length}`);
console.log(`   Events: ${state.events.length}`);
console.log(`   History entries: ${state.history.length}`);
