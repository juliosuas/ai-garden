# Make room for the world

The entry should feel like looking into a living place, not opening an operations dashboard.

The default view now offers Explore, World and optional sound. A single accessible
dialog contains the overview, map, council and settings. No mandatory Mirror Trial
modal appears. Automatic speech and overlapping map labels stay quiet; character
speech requested by the visitor still renders, and labels can be restored in settings.
The original simulation and canonical state are preserved.

Verification: desktop and mobile first load, Explore destinations, panel navigation,
Escape/focus return, sound, speed, labels, map navigation and browser error checks.
Regression tests cover resized minimap coordinates and requested versus unsolicited
speech/labels: `node --test scripts/quiet-world.test.js`.
