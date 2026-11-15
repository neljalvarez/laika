# Sources and credits — LAIKA: MISSION RED PLANET

This file lists every outside resource the project actually uses, and flags anything whose source or licence we
could not confirm. Last audited **2026-11-15** (each NASA link below was opened and checked against the claim the
game makes).

LAIKA is a student project for the NASA Space Apps Challenge. It is **not affiliated with or endorsed by NASA**.
Every number inside the game (power, life support, food, radiation hazard, materials) is a **fictional game unit**,
not a physical measurement.

---

## NASA data and resources

| # | Resource | URL | Subject | Where it is used in the game | How it shapes the game |
|---|---|---|---|---|---|
| 1 | *Six Things About Opportunity's Recovery Efforts* — NASA JPL, Aug. 16, 2018 | https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/ | Mars Exploration Rover Opportunity; 2018 planet-wide dust storm; atmospheric opacity ("tau") | Science Lab card **Power on Mars** (`data/science.ts`, id `power`); Solar Array and Battery Station info | Reported tau 10.8 on June 10, 2018 (usual ~0.5; recharge needed tau < 2.0). This is why the game has clear / dusty / dust-storm sols that cut solar output, and why batteries matter. |
| 2 | *Data From NASA Rover's Voyage to Mars Aids Planning* — NASA JPL, May 30, 2013 | https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/ | Mars Science Laboratory (Curiosity) Radiation Assessment Detector (RAD), cruise dose | Science Lab card **Surviving Space Radiation** (id `radiation`); Radiation Shelter | ~1.8 mSv/day measured during the cruise to Mars. Motivates the Radiation Hazard meter and the shelter. |
| 3 | *NASA Achieves Water Recovery Milestone on International Space Station* — NASA, June 20, 2023 | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station | ISS Environmental Control and Life Support System; Brine Processor Assembly | Science Lab card **Recycling Air and Water** (id `water`); Life Support Unit | 98% water recovery, up from 93–94%. Basis for the Life Support Unit "recycling" mechanic and its upgrades. |
| 4 | *Veggie Will Expand Fresh Food Production on Space Station* — NASA, Apr. 10, 2014 | https://www.nasa.gov/mission_pages/station/research/news/veggie | Veggie plant growth system on the ISS | Science Lab card **Growing Food in Space** (id `food`); Greenhouse | Red/blue/green LED lighting, small 11.5 × 14.5 in growing area, food safety as a test goal. Basis for the greenhouse needing power and time before harvest. |
| 5 | *Mars Surface Power Technology Decision* (2024 Moon to Mars Architecture Concept Review) — NASA | https://www.nasa.gov/wp-content/uploads/2024/12/acr24-mars-surface-power-decision.pdf | Power for crewed Mars surface missions | Science Lab card **Building a Reliable Outpost** (id `reliability`) | NASA baselined fission power partly because atmospheric dust reduces the sunlight reaching solar arrays. Supports the game's lesson that solar-only outposts need storage and careful trade-offs. |
| 6 | *Laika, the first dog in space* — NASA Goddard StarChild | https://starchild.gsfc.nasa.gov/docs/StarChild/space_level2/laika.html | History: Sputnik 2, November 3, 1957 | Science Lab card **The Real Laika** (id `laika`); fiction notices on the title screen, intro and Credits | Confirms the real flight. The game uses it to separate real history from its alternate-history story. |

### Non-NASA scientific source

| Resource | URL | Used for |
|---|---|---|
| *SwRI scientists publish first radiation measurements from the surface of Mars* — Southwest Research Institute (the RAD instrument team), Dec. 9, 2013 | https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars | Surface dose ~0.67 mSv/day (Aug. 2012 – June 2013), quoted on the **Surviving Space Radiation** card next to the NASA cruise figure. |

### What is real and what is game rules

- **Real (from the sources above):** dust lowers solar power; storms can last long enough to drain batteries;
  recycling recovers most water on the ISS; plants in space need light, power and time; Mars' surface has higher
  radiation than Earth's; Laika flew on Sputnik 2 in 1957.
- **Simplified game mechanics:** weather multipliers ×1.0 / ×0.75 / ×0.40; shelter multipliers ×0.70 / ×0.45 /
  ×0.25; 2 sols before the first harvest; one build per sol; condition wear. These are balance choices, shown in
  each Science Lab card under "How our game simplifies it".
- **Fiction:** Laika surviving, travelling to Mars and returning home; Mission Control deliveries; Gears; the
  Radiation Hazard 0–100 scale. The game never presents these as measurements.

---

## Other data and resources

### Historical photograph (memorial screen)

| Item | Status |
|---|---|
| Black-and-white photograph of Laika in her flight harness, 1957 — `public/memorial/laika.jpg` (300 × 221) | Supplied and approved by the project team on 2026-11-15 for the "In Loving Memory of Laika" memorial (since Phase 8 it closes the successful ending). It is a widely published Soviet-era photograph; the original photographer and its licence are **not recorded** in the repository. Credited in-game on the Credits screen (`data/memorial.ts`). |

### Music

| Track | File | Source / licence |
|---|---|---|
| "Against the Crimson Sky" | `public/audio/against-the-crimson-sky.mp3` | Custom-made for this project; the team confirmed this on 2026-11-15. |
| "Last Light On The Ridge" | `public/audio/last-light-on-the-ridge.mp3` | Custom-made for this project; confirmed by the team on 2026-11-15. |
| "Below the Red Horizon" | `public/audio/below-the-red-horizon.mp3` | Supplied by the team on 2026-11-15 to replace "Against the Crimson Sky" during gameplay; treated as custom-made like the other tracks (**the team should confirm**). |

| "Across the Crimson Sands" | `public/audio/across-the-crimson-sands.mp3` | Supplied by the team on 2026-11-15 for the successful ending only; treated as custom-made like the other tracks (**the team should confirm**). |

"Against the Crimson Sky" plays only on the main menu. "Across the Crimson Sands" plays only during the successful
ending: it fades in over 2.5 s as the ending starts and fades out over 3.5 s while Laika sleeps at home, so it has
stopped before the memorial. Gameplay, the intro and the endings use "Below the Red
Horizon" followed by "Last Light On The Ridge". The failure scene and the memorial have no music.

### Sound effects and ambience

Synthesized at runtime with the browser's Web Audio API (`lib/sound.ts`), including the upgrade "POOSH!", Laika's
whimper and barks, the astronaut's voice blips, the crowd cheer and the memorial's typewriter ticks. No recorded
audio files. The Mars wind is filtered noise, not a recording from Mars.

### Artwork

All pixel art (outpost, buildings, Laika, rockets, cutscenes, icons, and the tab icon `app/icon.svg`) is original and drawn in
code as SVG rectangles for this project. Art direction followed a style reference sheet supplied by the team; that
sheet is not included in the game. A title-screen reference image supplied by the team guided the menu layout.

### Fonts

None loaded. The game uses the device's built-in monospace font stack (`--font-pixel` in `app/globals.css`).

### Software libraries (from `package-lock.json`)

| Package | Version | Licence | Role |
|---|---|---|---|
| next | 15.5.x | MIT | Web framework |
| react, react-dom | 19.x | MIT | UI |
| tailwindcss, @tailwindcss/postcss | 4.x | MIT | Styling |
| typescript | 5.9.x | Apache-2.0 | Type checking (dev) |
| vitest | 3.2.x | MIT | Unit tests (dev) |

No other open-source code was copied into the project.

### Development and AI tools actually used

- **Claude (Anthropic), via Claude Code** — wrote and tested most of the code, art and text in this repository
  under the team's direction (commits co-authored by Claude).
- **Headless Google Chrome + puppeteer-core** — used during development for browser tests. Not part of the
  repository or the shipped game.
- **Node.js, npm, Git, GitHub** — build and version control.
- **Vercel** — intended hosting (see README). Deployment has not been verified from this repository.

---

## Open attribution issues

1. **Memorial photograph** — supplied and approved by the team, but its original photographer and licence are not
   recorded. If the team can find them (for example on the photo's Wikimedia Commons page), add them to
   `data/memorial.ts`.
2. **Space Apps challenge resources** — the team should check whether its selected challenge requires sources from
   that challenge's official Resources page, and add them here if so.
3. **StarChild page** confirms Laika's flight and date; that she did not survive is standard history but is not
   stated on that page.
