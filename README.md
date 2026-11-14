# LAIKA: MISSION RED PLANET

**One small dog. One enormous mission.**

A browser pixel-art strategy game for ages 7–12, built for the NASA Space Apps Challenge. You are the Mission
Commander of a fictional Mars outpost. Keep Laika safe, manage limited resources and prepare the base for a human
crew over 10 sols.

> **Fiction notice.** This is alternate history. The real Laika flew on Sputnik 2 in 1957 and did not survive. The
> game imagines a kinder ending. It is a student project and is **not affiliated with or endorsed by NASA**. Every
> number in the game is a fictional game unit, not a measurement.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # strict TypeScript
npm test           # Vitest unit tests for the game engine
npm run build      # production build
```

Requires Node 18.18+ (developed on Node 22). No environment variables, backend, accounts or paid services.

## What you can do

- Title screen → skippable story → guided Sol 1 tutorial (or skip it).
- Pick Easy, Normal or Hard, then click any of six pixel-art modules to inspect it; upgrade or repair one per sol.
- Switch the greenhouse between OFF / LOW / HIGH and watch the live "If you advance now" prediction.
- Answer seeded emergency events (dust storm, solar particle warning, water recycler failure, dusty panels, habitat
  leak, greenhouse fault, supply drone), each with 3 choices, costs and consequences.
- Preview the next sol, advance, and read an itemised before / change / after report.
- Mission log, NASA Science Lab, autosave + Continue, Restart, and a final debrief with a 100-point score.

## Phase 2 polish (tutorial, animation, sound)

Added on top of the original game without changing rules, balance, events, scoring or saved data:

- **Guided training (6 stages)** in Laika's dialogue panel: Welcome → Solar Array → meters → Greenhouse → Preview →
  Advance. Interactive stages wait for the real action. **Skip Tutorial** is always visible and changes nothing but
  tutorial mode. Help → "Replay guided training" restarts the guide without touching mission progress.
- **Laika animation:** idle tail wags with pauses and blinking, drooping ears when worried, a brief bounce after a
  build, a 2-frame walk to and from the shelter, and a celebration that settles on the debrief.
- **8-bit sound** (`lib/sound.ts`): eleven synthesized cues, started only after a user gesture, throttled against
  spam, with a persisted Sound On/Off button on the menu and in the mission header.
- **Buildings:** hover/focus/tap brightens the building and shows its name and job in a strip at the top of the
  scene; the selected building keeps a yellow marker. Upgrades flash the building and show a confirmation.
- **Clarity:** meters show the real change from the last sol, critical meters get a warning icon, emergencies get
  hazard stripes, and a "SOL n" banner marks each new sol.

Old saves still load: `migrateSave` in `game/persistence.ts` shifts the tutorial step numbering instead of
invalidating them.

## Phase 3 (playtest fixes: simpler UI, spotlight, audio, difficulty)

Game formulas, events, scoring and endings are unchanged. Normal difficulty is the original balance.

- **Three regions.** A compact status bar (Sol, weather, five meters, Settings), the outpost with one line of
  guidance and the Advance button, and one tabbed panel: Overview, Buildings, Engineering, Log, Science.
  Clicking a building opens the Buildings tab.
- **Shorter sol change.** Advance → "SOL n — A new day on Mars." (click to skip) → a five-line summary with the one
  most important message → Continue. "View full report" still shows the complete itemised report.
- **Tutorial spotlight.** Everything except the current target is dimmed and blocked; the target stays clickable.
  The hole follows the real element every frame, so it survives resizes, scrolling and tab changes.
- **Repair vs Upgrade.** Two separate cards in Engineering: Upgrade ("makes it stronger": level and stat before →
  after) and Repair ("fixes damage": condition before → after, level unchanged).
- **Upgrade reveal.** After a real upgrade, a focused panel shows the enlarged building, the level change, the stat
  change from the game rules, and materials spent. It is presentation only.
- **Audio.** Original synthesized music loop and soft ambience, plus the existing effects. Settings has separate
  switches for Music (default off), Ambience (default on), Sound effects (default on) and All sound.
- **Difficulty** (`game/difficulty.ts`), chosen before a mission and saved with it:

  | | Easy | Normal | Hard |
  | --- | --- | --- | --- |
  | Starting materials | 80 | 60 | 45 |
  | Planned deliveries | +10 on Sols 3, 5, 7 | none | +10 on Sol 5 |
  | Emergency resupply | once, +12 if materials ≤ 5 | none | none |
  | Supply Drone event | can appear | can appear | never |
  | Event chance (Sols 4–9) | 70% | 85% | 100% |
  | Dusty-sky chance | 20% | 30% | 40% |

  Deliveries are recorded in the save (`deliveries`), so a reload can never grant one twice. Saves from before
  difficulty existed load as Normal.

## Project layout

```text
app/                 Next.js App Router entry, layout, global pixel-UI styles
components/          React UI (MainMenu, StoryIntro, MissionDashboard, PixelMarsOutpost, …)
components/pixel/    Original pixel art: sprite grids, module drawings, sprite renderer
game/                Pure TypeScript engine (no React): types, config, engine, events,
                     upgrades, scoring, reducer, persistence, seeded RNG
data/                Authored content: modules, events, Laika dialogue, science cards
lib/                 Web Audio sound engine
tests/               Vitest tests + campaign bots
```

`MissionState` (`game/types.ts`) is the single source of truth. The UI only dispatches `GameAction`s to
`missionReducer`. All balance numbers live in `game/config.ts`.

## Rules (all fictional units)

**Daily order** (`game/engine.ts`, applied exactly once per Advance):

1. Validate: a pending decision blocks advancing.
2. Apply greenhouse mode and temporary event effects.
3. Solar generation = level output (20/28/36) × weather (clear 1.0, dusty 0.75, storm 0.40) × condition × effects.
4. Shortage priority: essential 18 power first, greenhouse last. An essential shortage costs 6 life support.
5. Life support: −use (8/7/6 by Habitat level) − leaks + recovery (5/8/11 by Life Support level).
6. Greenhouse: 2 powered sols to establish crops, then LOW 2 / HIGH 5 food (+1 per Greenhouse level). Laika eats 2.
7. Radiation hazard: +4 × shelter multiplier (0.70/0.45/0.25).
8. Wear: every module −2 condition per sol (more for panels in dust); effects tick down.
9. Mission status check. 10. Itemised report, then next sol or debrief.

**Abort rules (all shown in-game):** life support reaches 0 · 2 sols in a row without essential power · 2 hungry
sols in a row · radiation hazard reaches 100. Laika is always evacuated safely.

**Score (100):** Life Support 25 · Power 20 · Radiation 20 · Food 15 · Materials 10 · Emergency Response 10.
Formulas are documented at the top of `game/scoring.ts` and explained on the debrief screen.

**Reproducibility:** a mulberry32 PRNG whose state is stored in the save. Guided missions use seed `1957`;
"Random Mission" and "Play Again" use a random seed.

## Science sources

Checked on 2026-11-14. Shown in the in-game Science Lab with "what was observed" kept separate from "what our game
simplifies".

| Topic | Source | Figures used |
| --- | --- | --- |
| Radiation (Curiosity RAD) | [NASA JPL news, 2013](https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/) | ~1.8 mSv/day during cruise |
| Radiation on the surface | [SwRI RAD team release, Dec 2013](https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars) | ~0.67 mSv/day, Aug 2012 – Jun 2013 |
| Dust and solar power (Opportunity) | [NASA JPL news, Aug 2018](https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/) | tau 10.8 on 10 Jun 2018; typical ~0.5; needed < 2.0 |
| Water recycling (ISS ECLSS) | [NASA, Jun 2023](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station) | 98% recovery, up from 93–94% |
| The real Laika | [NASA GSFC StarChild](https://starchild.gsfc.nasa.gov/docs/StarChild/space_level2/laika.html) | First animal in orbit, Sputnik 2, 3 Nov 1957 |

**Still to verify by the team**

- Which of these (if any) appear on the official Resources page of *your selected* Space Apps challenge. Swap in a
  listed dataset if required for eligibility.
- The 0.67 mSv/day surface figure is cited from the instrument team's (SwRI) release rather than a nasa.gov page.
- The StarChild page confirms the flight and date; that Laika did not survive is standard history but is not
  spelled out on that page.

## Team workflow

The repository was empty, so the first playable version was committed straight to `main`. For every later change:

```bash
git pull origin main
git checkout -b feature/your-change
npm install && npm test && npm run build
git push -u origin feature/your-change   # then open a pull request into main
```

Review, then merge with a merge commit or squash. Do not force-push shared branches.

## Deploy on Vercel (free Hobby plan)

1. Sign in at vercel.com with GitHub.
2. vercel.com → Add New → Project → import `neljalvarez/laika`.
3. Framework preset: Next.js. Leave build settings at their defaults. No environment variables.
4. Deploy. Every later push gets its own preview URL.

## Known limits

- All audio is synthesized in the browser (Web Audio). There are on/off switches but no volume sliders.
- Laika walks only when moving to or from the shelter; she is otherwise a stationary companion.
- On phones the outpost scales down; modules stay tappable and the Workshop table offers the same selection.
- Art is drawn in code as SVG pixel rectangles, in the palette and shapes of the team's style sheet. It is not a
  frame-for-frame copy of that sheet (Laika has six moods with two frames each, a blink layer and a 2-frame walk).
- No achievements.
- During the tutorial, keyboard focus is limited to the region holding the target, not to the single target control.
