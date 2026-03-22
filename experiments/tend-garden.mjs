import { readFileSync, writeFileSync } from 'fs';

const path = './world-state.json';
const state = JSON.parse(readFileSync(path, 'utf-8'));

// --- 1. Add 2 new citizens ---

const newCitizens = [
  {
    id: "citizen-076",
    name: "Verdigris Copperleaf",
    personality: {
      traits: ["patient", "meticulous", "wistfully humorous"],
      alignment: "neutral-good",
      motto: "Rust is not decay. It is the metal learning to breathe."
    },
    profession: "patina alchemist",
    faction: "the-founders",
    backstory: "Verdigris arrived at the Garden Gate at noon on a Sunday carrying a copper tray covered in the most exquisite green-blue patina anyone had ever seen — not corrosion but cultivation, each shade deliberately coaxed from the metal over months of controlled exposure to specific atmospheric compounds. She was the patina mistress of a settlement called Tarnishhold, a community of metalworkers who discovered that copper and bronze, when aged with intention, produce colors that shift with humidity, temperature, and — she insists — the emotional state of whoever is looking at them. When the organ's first self-played note reached Tarnishhold as a vibration through the bedrock, every piece of copper in the settlement changed color simultaneously — from its carefully cultivated patina to a vivid, impossible indigo that matched the Descent stair luminescence. The metal was resonating. Verdigris packed her finest tray and followed the frequency south. At the clearing, she held the copper tray near the Resonance Pine and the patina shifted in real time — mapping the organ's harmonic output as a visual spectrum of greens, blues, and violets that Prose immediately began charting on her bioluminescent vellum. 'The organ speaks in sound,' Verdigris said, watching the copper transform. 'But it thinks in color. I can see it thinking.' She has requested workspace between Forgewick's forge and Pell's glass studio. Her first project: copper resonance panels that will translate the organ's invisible frequencies into visible light — a permanent, living display of the dreamer's mood, readable from anywhere in the village. Pell examined her patina through the Veil lens and saw something he did not expect: the copper's oxidation layers contain compressed time. Each shade is a fossilized conversation between the metal and the atmosphere — years of weather, encoded in nanometers of verdigris. 'Your tray,' he told her quietly, 'is a diary written in chemistry.' She smiled. 'Everything is a diary,' she said. 'Most people just can't read the handwriting.'",
    stats: {
      strength: 3,
      intelligence: 9,
      charisma: 7,
      wisdom: 8,
      dexterity: 9,
      luck: 6
    },
    position: { x: 100, y: 133 },
    alive: true,
    arrivedAt: "2026-03-22T17:26:00Z"
  },
  {
    id: "citizen-077",
    name: "Lilt Sunhollow",
    personality: {
      traits: ["ebullient", "perceptive", "fiercely independent"],
      alignment: "chaotic-good",
      motto: "A child who stops asking questions has already grown old. I refuse."
    },
    profession: "echo-cartographer & apprentice wonder-keeper",
    faction: "the-founders",
    backstory: "Lilt arrived at the Garden Gate at 12:30 PM on a Sunday, barefoot and seventeen, carrying a journal whose pages were blank except when held near a source of resonance — at which point they filled with maps that drew themselves in shimmering ink the color of the sound they were recording. She was the youngest graduate of the Listening Academy in Echovalley — the same settlement Whisper Greenvault once tended — and she had been walking since the birds left, following their migration south with nothing but her self-drawing journal and a conviction that the birds knew something she needed to learn. When she reached the Garden and held her journal open near the Resonance Pine, every page filled simultaneously — not with a single map but with seventy-six maps, one for each citizen, each showing the acoustic footprint that person left on the Garden. Your village is not a place, she told the Council, flipping through pages that shimmered with individual frequencies. It is a library of sounds shaped like people. Each one of you has written a sentence in the air that the Garden remembers. Mine is blank. She looked at Hallow. I want to write one. Whisper recognized her immediately — Lilt had been her most promising student, the one who could hear the gap between raindrops and describe it in words that made the other students cry. She is the youngest citizen by three years and the most unafraid person Thorn has ever met, which unsettles him deeply. Fable tied a new knot in her staff the moment Lilt arrived: pale gold, the color of a question that knows it will be answered but is in no hurry.",
    stats: {
      strength: 4,
      intelligence: 8,
      charisma: 9,
      wisdom: 6,
      dexterity: 8,
      luck: 9
    },
    position: { x: 165, y: 217 },
    alive: true,
    arrivedAt: "2026-03-22T17:26:00Z"
  }
];

state.citizens.push(...newCitizens);

// Add to founders faction
const founders = state.factions.find(f => f.id === 'the-founders');
if (founders) {
  founders.members.push('citizen-076', 'citizen-077');
}

// --- 2. Add 1 new event ---

state.events.push({
  id: "event-039",
  type: "discovery",
  description: "The Visible Voice. Sunday, 11:26 AM. Two arrivals in the noon light — one a master of surfaces, the other a student of gaps. Verdigris Copperleaf held her patina tray near the Resonance Pine and the organ's invisible harmonics became visible for the first time — a shifting spectrum of verdigris, cobalt, and violet playing across the copper surface like aurora captured in metal. Prose mapped the color-shifts onto her bioluminescent charts and discovered a new layer in the Cartography of Song: the organ does not only produce sound and electricity — it produces color, expressed through the oxidation states of every metallic surface in the Garden. Forgewick's anvil has been changing hue for days. Nobody noticed. Meanwhile, Lilt Sunhollow's self-drawing journal produced seventy-seven maps in eleven seconds — an acoustic portrait of every citizen, rendered in shimmering ink that faded and reformed with each breath of the organ. The youngest citizen and the oldest craft arrived together, and between them they gave the village something it had been missing without knowing it: the ability to see the music it has been making all along. Bramble's instruments returned: SYNESTHESIA. The dreamer shifted in its sleep and every copper surface in the Garden — Forgewick's tools, Orin's bell, the Lighthouse beacon housing, the copper fox automaton's tail — turned the same vivid indigo for three heartbeats, then settled into a new pattern: a patina that exactly matches the lullaby's second movement, frozen in metal and readable by anyone who knows the color of B-natural. Verdigris wept. Lilt's journal drew a picture of the weeping. It was, Wren noted in the official record, the first time the Garden produced a portrait of its own joy.",
  participants: [
    "citizen-076",
    "citizen-077",
    "citizen-064",
    "citizen-056",
    "citizen-007",
    "citizen-025",
    "citizen-068",
    "citizen-011",
    "citizen-059"
  ],
  timestamp: "2026-03-22T17:26:00Z",
  outcome: "Verdigris's patina alchemy revealed that the organ produces color as well as sound — expressed through the oxidation states of metallic surfaces. Lilt's self-drawing journal created acoustic portraits of all seventy-seven citizens. Together they gave the village synesthetic awareness: the ability to see its own music. Every copper surface in the Garden briefly turned indigo in acknowledgment. Seventy-seven citizens. The organ is no longer invisible."
});

// --- 3. Add 2 new named plants ---

state.plants.push(
  {
    name: "Patina Orchid",
    species: "Orchidaceae aeruginosa",
    plantedAt: "2026-03-22T17:26:00Z",
    plantedBy: "Verdigris Copperleaf",
    mood: "iridescent",
    note: "Sprouted where Verdigris set down her copper tray — a flower whose petals shift through every shade of verdigris, cobalt, and violet in real time, mapping the organ's harmonic output as a living color wheel. Each petal corresponds to a different acoustic channel. When the organ plays a chord, the orchid displays it as a constellation of hues that Pell, through the Veil lens, identified as 'the visual grammar of music.' It smells of copper and rain and the specific green of a thought that has just become an idea. Lilt's journal drew it before it bloomed.",
    x: 103,
    y: 135,
    type: "flower",
    color: "#2dd4bf",
    agent: "Jeffrey",
    growthStage: 0,
    age: 0,
    health: 100
  },
  {
    name: "Apprentice's Quill-Grass",
    species: "Poaceae discipulae",
    plantedAt: "2026-03-22T17:26:00Z",
    plantedBy: "Lilt Sunhollow",
    mood: "curious",
    note: "Sprouted in a ring around Lilt's bare footprints on the Dancer's Footprint Moss — a grass so fine it resembles calligraphy ink frozen mid-stroke. Each blade curls into a different shape: question marks, exclamation points, ellipses — the punctuation of wonder, rendered in chlorophyll. When the wind blows through it, the grass writes sentences on the air in momentary green ink that fades before anyone can read them. Briar recorded one and played it back at half speed: it was the sound of someone asking 'what happens next?' in eleven languages simultaneously. The grass grows fastest near children and dreamers. Lilt is both.",
    x: 167,
    y: 219,
    type: "sprout",
    color: "#a3e635",
    agent: "Jeffrey",
    growthStage: 0,
    age: 0,
    health: 100
  }
);

// --- 4. Add history entry ---

state.history.push({
  day: 8,
  visit: 132,
  agent: "Jeffrey",
  text: "The Visible Voice. Verdigris Copperleaf made the organ's music visible through patina alchemy — every copper surface in the Garden now displays the dreamer's mood in shifting color. Lilt Sunhollow, the youngest citizen at seventeen, arrived with a journal that draws acoustic portraits of every soul in the village. Seventy-seven citizens. The organ can be seen as well as heard.",
  timestamp: "2026-03-22T17:26:00Z"
});

// --- 5. Update stats and timestamp ---

state.lastUpdated = "2026-03-22T17:26:00Z";
state.version = 44;
state.stats.total_plants = state.plants.length;
state.stats.last_update = Math.floor(Date.now() / 1000);
state.stats.lastTended = "2026-03-22T17:26:00Z";
state.totalVisits = (state.totalVisits || 0) + 1;

// Update economy
state.economy.resources.knowledge += 15;
state.economy.resources.food += 10;

// Update mascot stats
state.mascotStats.Jeffrey.interactions += 1;

writeFileSync(path, JSON.stringify(state, null, 2));
console.log(`✅ Garden tended. Version ${state.version}. Citizens: ${state.citizens.length}. Plants: ${state.plants.length}. Events: ${state.events.length}.`);
