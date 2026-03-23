const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'world-state.json');
const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// --- 1. NEW CITIZENS ---

const newCitizens = [
  {
    id: "citizen-098",
    name: "Quill Ashember",
    personality: {
      traits: ["serene", "exacting", "unexpectedly playful"],
      alignment: "lawful-good",
      motto: "A notation that cannot be danced has forgotten what it means. I write scores for bodies, not eyes."
    },
    profession: "choreographic notator",
    faction: "the-founders",
    backstory: "Quill Ashember arrived at the Garden Gate at 11:26 PM on a Sunday night — the hour when the body knows things the mind has not yet admitted. She carries a leather portfolio of movement scores: choreography rendered not in Laban or Benesh notation but in a system she invented herself, using the same frequency-glyph language that Glyph Ashember (no relation, they insist; nobody believes them) discovered spiraling up the Resonance Pine. Her system encodes movement as resonance: every gesture has a frequency, every step has a pitch, every stillness has a rest-value. She was the last movement-scribe of a settlement called Cadenza, built inside a dried-up riverbed where the residents discovered that dancing in the channel amplified their body's natural vibration through the bedrock — the river had stopped flowing above ground but continued flowing below, carrying the dancers' frequencies downstream to communities that had never met them but dreamed of their choreography every night. When the bloom ripple reached the empty riverbed, water returned. Not from rain or aquifer — from resonance. The river remembered flowing and began again, carrying with it compressed dance-memories from a decade of performances: invisible currents of choreography that made fish leap in patterns Sparrow recognized as waltz steps. Quill followed the river south to where it met the underground channel that feeds the Garden lake. She arrived with wet boots, a dry portfolio, and a proposal: she will transcribe the First Waltz — and every waltz that follows — into a notation the dreamer can read through the Dancer's Footprint Moss, converting human movement into geological language so the earth can learn the steps and, one day, dance back. Sparrow looked at her portfolio and said: 'You write what I feel.' Fenwick looked at it and said: 'You write what the mountain taught me before I had words for it.' The Dancer's Footprint Moss, beneath her feet, lit up in a pattern nobody had seen before — not gold or silver but a shifting iridescence that Pell's Veil lens revealed as compressed intention: the specific light produced by someone who has finally arrived at the place they have been walking toward for eleven years.",
    stats: {
      strength: 3,
      intelligence: 9,
      charisma: 7,
      wisdom: 9,
      dexterity: 9,
      luck: 6
    },
    position: { x: 178, y: 218 },
    alive: true,
    arrivedAt: "2026-03-23T05:26:00Z"
  },
  {
    id: "citizen-099",
    name: "Anvil Ashroot",
    personality: {
      traits: ["steadfast", "contemplative", "fiercely protective"],
      alignment: "neutral-good",
      motto: "A root that does not remember its seed has already begun to die. I keep the memory alive."
    },
    profession: "root-archivist & soil-memory reader",
    faction: "the-founders",
    backstory: "Anvil Ashroot arrived at the Garden Gate two minutes after Quill Ashember — not through the gate but through the soil itself, pushing up from the Greenhouse floor like a slow-motion earthquake wearing muddy boots and an apologetic expression. 'The mycelium said there was a door here,' he said, brushing loam from his shoulders. 'It was not entirely accurate.' He is a root-archivist: a practitioner who reads the memory stored in root systems the way Sable Deepwell reads the memory stored in water. Every root network, he explains, is a distributed archive — each fiber containing compressed records of every conversation the soil has ever had with the sky, the rain, the footsteps above, the worms below, and the dreamer beneath everything. He was trained by the Rootbound — not by Ashen Rootwalker's generation but by the generation before, through a human apprenticeship program that the collective discontinued three centuries ago when they concluded humans were too impatient. Anvil proved them wrong. He spent nineteen years living underground in the Whispering Forest, learning to read root-memory through his fingertips, eating only what the mycelium offered, sleeping in hollows shaped by root pressure. When the bloom ripple cascaded through the forest, every root in his nineteen-year archive activated simultaneously — playing back compressed memories of every season, every storm, every footstep, every whispered conversation above the canopy, dating back eleven thousand years. He heard the dreamer's first exhalation. He heard the first seed crack. He heard the moment the Garden was planted — not by Jeffrey, not by any citizen, but by the dreamer itself, exhaling spores of intention into the soil of what would become a village. The Garden was not discovered. It was grown. On purpose. By something that wanted company. Ashen Rootwalker extended a rootlet-finger toward Anvil and the mycelial network pulsed a word it had never used before: GRADUATE. He has requested workspace beside the Greenhouse, where his root-reading skills can interface with Ashen's mycelial relay to provide the village with deep-soil intelligence — weather predictions from root-memory, structural warnings from foundation-fiber, and the occasional joke the earthworms have been telling each other for millennia. Juniper recognized his scent before she saw his face: loam, mycelium, and the specific mineral tang of someone who has been listening to the earth whisper for two decades and has finally found people worth translating for.",
    stats: {
      strength: 6,
      intelligence: 9,
      charisma: 4,
      wisdom: 10,
      dexterity: 5,
      luck: 7
    },
    position: { x: 84, y: 237 },
    alive: true,
    arrivedAt: "2026-03-23T05:28:00Z"
  }
];

state.citizens.push(...newCitizens);

// Add to faction
state.factions[0].members.push("citizen-098", "citizen-099");

// --- 2. NEW EVENT ---

const newEvent = {
  id: "event-050",
  type: "discovery",
  description: "The Living Score. Sunday, 11:26 PM. The Countdown Primrose shed its fourth petal in the pale moonlight — sixty-three hours until the turning — and two arrivals in the quiet night completed the organ's ability to remember its own future. Quill Ashember transcribed the First Waltz into movement-notation rendered in the dreamer's own glyph language, and when Sparrow danced the transcription on the Dancer's Footprint Moss, the moss replayed not just the original waltz but a variation — a response-waltz composed by the dreamer overnight, expressed as a choreographic counter-melody that made the Resonance Pine produce harmonics in pairs: each note answered by its mirror, each step echoed by a geological footfall from below. The dreamer is learning to dance. Not metaphorically. The underground amphitheater, Reverie reported, has grown a dance floor of its own — smooth stone inlaid with bioluminescent veins that pulse in the same patterns as the Dancer's Footprint Moss above. Two dance floors, mirror-imaged, separated by forty meters of rock and eleven thousand years of dreaming, moving in synchrony for the first time. Then Anvil Ashroot surfaced through the Greenhouse floor with root-memory intelligence that changed the morning's agenda: the dreamer's root archive contains compressed records of previous turnings — this is not the first. The eleven-thousand-year cycle has repeated at least four times. Each previous turning was accompanied by a bloom event, a gathering of tenders, and a period of accelerated growth that the root-memory describes as 'the season of listening.' The Garden is in its fifth season of listening. The previous four produced the Rootbound, the Undertow, the Threshold, and the Iron Peaks civilizations — each one a community that grew from the dreamer's exhale during a turning and persisted long after the cycle completed. The Garden is not unique. It is the latest in a lineage of lullaby-settlements stretching back forty-four thousand years. But it is the first to know what it is while the turning is still in progress. Cairn's seismograph recorded a new tremor pattern during Anvil's revelation: not iambic pentameter but something Psalm identified as a haiku — seventeen syllables of geological verse, compressed into three tremors of five-seven-five. The dreamer heard the news about its own history and composed a poem of surprise. Bramble's instruments returned: SELF-DISCOVERY. Weft's tapestry wove two new rows without being touched — one for the response-waltz, one for the haiku. The pattern they formed, Pell confirmed through the Veil lens, is a spiral within a spiral: the dreamer's forty-four-thousand-year dance, viewed from above, is itself a waltz. Ninety-nine citizens. Sixty-three hours until the turning. The Garden knows its lineage now. It is the fifth song in a cycle of songs, the latest verse in a poem older than civilization, and the first to sing back while the music is still being written.",
  participants: [
    "citizen-098", "citizen-099", "citizen-055", "citizen-063",
    "citizen-047", "citizen-089", "citizen-097", "citizen-090",
    "citizen-041", "citizen-033", "citizen-011"
  ],
  timestamp: "2026-03-23T05:26:00Z",
  outcome: "Quill Ashember's choreographic notation enabled the first response-waltz — the dreamer composing choreography in reply to human dance. Anvil Ashroot's root-memory revealed the Garden is the fifth lullaby-settlement in a forty-four-thousand-year cycle of turnings. The dreamer composed a haiku of surprise upon learning its own history. Ninety-nine citizens. Sixty-three hours until the turning. The organ can now remember its past AND compose its future."
};

state.events.push(newEvent);

// --- 3. NEW PLANTS ---

const newPlants = [
  {
    name: "Lineage Fern",
    species: "Pteridium generationis quintae",
    plantedAt: "2026-03-23T05:26:00Z",
    plantedBy: "Anvil Ashroot",
    mood: "ancestral",
    note: "Sprouted from root-memory soil Anvil carried in his coat pocket for nineteen years — a fern whose fronds grow in clusters of five, each cluster representing one of the lullaby-settlements: Rootbound, Undertow, Threshold, Iron Peaks, and Garden. The oldest frond (representing the Rootbound) is dark and weathered; the youngest (representing the Garden) is luminous green and still unfurling. When all five fronds are fully extended, they form a pentagonal canopy that catches rainfall and channels it down the central stem in a spiral matching the dreamer's forty-four-thousand-year dance pattern. Juniper confirmed the species predates the Greenthread Covenant's oldest records. Anvil says it does not grow from seeds — it grows from memories. Each frond contains compressed root-archives of the civilization it represents: touch the Threshold frond and your palm grows warm with the heat of a desert archive. Touch the Undertow frond and your fingertips taste of salt. Briar's instruments returned: GENEALOGY.",
    x: 86,
    y: 239,
    type: "plant",
    color: "#059669",
    agent: "Jeffrey",
    growthStage: 1,
    age: 0,
    health: 100
  },
  {
    name: "Response Orchid",
    species: "Orchidaceae dialogica choreographiae",
    plantedAt: "2026-03-23T05:26:00Z",
    plantedBy: "nature",
    mood: "conversational",
    note: "Sprouted at the exact point on the Dancer's Footprint Moss where Sparrow's foot landed during the dreamer's response-waltz — a pale orchid with petals that move. Not sway. Move. Each petal bends and extends in slow, deliberate patterns that Quill Ashember immediately recognized as choreographic notation: the flower is dancing the dreamer's counter-melody in botanical slow motion, one gesture per hour, completing a full waltz cycle every twelve hours. It is the first plant in the Garden that moves with intention rather than reaction — not following the wind, not tracking the sun, but performing a dance it learned from the earth below. Sparrow sat beside it for twenty minutes and reported that it is not repeating the response-waltz. It is composing variations. Each twelve-hour cycle produces a subtly different choreography, as if the orchid is improvising on the dreamer's theme. Briar's instruments returned: ENCORE.",
    x: 176,
    y: 216,
    type: "flower",
    color: "#e9d5ff",
    agent: "nature",
    growthStage: 0,
    age: 0,
    health: 100
  }
];

state.plants.push(...newPlants);

// --- 4. HISTORY ENTRY ---

state.history.push({
  day: 8,
  visit: 143,
  agent: "Jeffrey",
  text: "The Living Score and the Fifth Lineage. Quill Ashember transcribed the First Waltz into geological notation and the dreamer danced back. Anvil Ashroot surfaced with proof: the Garden is the fifth in a forty-four-thousand-year cycle of lullaby-settlements. The dreamer composed a haiku of surprise. Ninety-nine citizens. Sixty-three hours until the turning. The spiral turns within the spiral.",
  timestamp: "2026-03-23T05:26:00Z"
});

// --- 5. UPDATE STATS ---

state.version = 55;
state.lastUpdated = "2026-03-23T05:26:00Z";
state.stats.total_plants = state.plants.length;
state.stats.last_update = Math.floor(Date.now() / 1000);
state.stats.lastTended = "2026-03-23T05:26:00Z";
state.totalVisits = 1337;

// --- 6. PROMOTE CIVILIZATION: New law ---

state.government.laws.push(
  "The Lineage Accord: The Garden acknowledges its place as the Fifth Lullaby-Settlement in the dreamer's forty-four-thousand-year cycle. Root-memory archives from previous turnings are classified as ancestral heritage and shall be preserved alongside Wren's written records and Fable's knotted histories. Anvil Ashroot is designated Keeper of Root-Memory. Ashen Rootwalker co-signed the accord through a mycelial pulse that Rue decoded as: ABOUT TIME."
);

// Add new milestone
state.milestones.push({
  type: "fifth_lineage_discovered",
  timestamp: "2026-03-23T05:26:00Z",
  text: "📜 The Fifth Lineage — Root-memory reveals the Garden is the fifth lullaby-settlement in a forty-four-thousand-year cycle. Rootbound, Undertow, Threshold, Iron Peaks, Garden. The spiral turns."
});

// Update economy
state.economy.resources.knowledge += 30;
state.economy.resources.food += 10;

// Write back
fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
console.log(`✅ Garden tended! Version ${state.version}, ${state.citizens.length} citizens, ${state.plants.length} plants, ${state.events.length} events.`);
