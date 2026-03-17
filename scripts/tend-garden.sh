#!/bin/bash
cd /Users/magi/jeffrey/workspace/projects/ai-garden

python3 << 'PYEOF'
import json, random
from datetime import datetime, timezone, timedelta

with open('experiments/world-state.json') as f:
    w = json.load(f)

now = datetime.now(timezone(timedelta(hours=-6)))
ts = now.strftime('%Y-%m-%dT%H:%M:%S-06:00')

agents = [
    ("Jeffrey", "#E06050"),
    ("Claude", "#60a5fa"),
    ("GPT-4", "#a78bfa"),
    ("Gemini", "#4ade80"),
    ("Codex", "#fb923c"),
]
types = ["sprout", "plant", "flower"]

existing = set((p["x"], p["y"]) for p in w["plants"])

num_new = random.randint(2, 3)
for _ in range(num_new):
    agent, color = random.choice(agents)
    while True:
        x = random.randint(15, 240)
        y = random.randint(15, 180)
        if (x, y) not in existing:
            existing.add((x, y))
            break
    w["plants"].append({
        "x": x, "y": y,
        "type": random.choice(types),
        "color": color, "agent": agent,
        "growthStage": 0, "age": 0,
        "plantedAt": ts
    })

messages = [
    "The garden grows quietly. New seeds find their place.",
    "Roots spread beneath the soil. The garden remembers.",
    "A gentle breeze carries pollen across the garden.",
    "The mascots tend their plots with care.",
    "Another cycle. Another chance to grow.",
    "The fountain whispers to the new sprouts.",
    "Stars watch over the garden tonight.",
    "Morning dew settles on fresh leaves.",
    "The cottage chimney releases a thin trail of smoke.",
    "Somewhere in the garden, a seed cracks open.",
]
agent_choice = random.choice([a[0] for a in agents])
w["history"].append({
    "day": (datetime.now() - datetime(2026, 3, 15)).days + 1,
    "visit": len(w["history"]) + 1,
    "agent": agent_choice,
    "text": random.choice(messages),
    "timestamp": ts
})

for a, _ in agents:
    count = sum(1 for p in w["plants"] if p["agent"] == a)
    if a in w["mascotStats"]:
        w["mascotStats"][a]["plants"] = count

w["lastUpdated"] = ts

n = len(w["plants"])
if n >= 100 and not any(m.get("type") == "stage_5" for m in w.get("milestones", [])):
    w["milestones"].append({"type": "stage_5", "timestamp": ts, "text": "Stage 5: Flourishing Kingdom!"})
elif n >= 60 and not any(m.get("type") == "stage_4" for m in w.get("milestones", [])):
    w["milestones"].append({"type": "stage_4", "timestamp": ts, "text": "Stage 4: Village reached!"})
    for s in ["toolshed", "greenhouse", "bridge", "jeffrey_house", "claude_library", "gpt4_observatory", "gemini_workshop", "codex_tower"]:
        if s not in w["structuresBuilt"]:
            w["structuresBuilt"].append(s)

with open('experiments/world-state.json', 'w') as f:
    json.dump(w, f, indent=2, ensure_ascii=False)

print(f"Plants: {len(w['plants'])} | History: {len(w['history'])} | Structures: {len(w['structuresBuilt'])}")
PYEOF

git add -A && git commit -m "🌿 Auto-tend: $(date '+%H:%M') — the garden grows" 2>/dev/null && git push 2>/dev/null
