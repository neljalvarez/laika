// Science Lab cards. Every figure below was checked against the linked source
// on 2026-11-14. "observed" = what the source reports; "simplified" = what our
// fictional game does with the idea. Game units are never NASA measurements.

export interface ScienceCard {
  id: string;
  title: string;
  mission: string;
  context: string;
  sourceTitle: string;
  sourceUrl: string;
  extraSource?: { title: string; url: string };
  observed: string;
  simplified: string;
  mechanic: string;
}

export const SCIENCE_CARDS: ScienceCard[] = [
  {
    id: "rad",
    title: "Radiation on the way to Mars — and on it",
    mission: "Mars Science Laboratory / Curiosity rover — Radiation Assessment Detector (RAD)",
    context: "Cruise to Mars, Dec 2011 – Jul 2012; Gale Crater surface, Aug 2012 – Jun 2013",
    sourceTitle: "NASA JPL: Data From NASA Rover's Voyage to Mars Aids Planning",
    sourceUrl: "https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/",
    extraSource: {
      title: "SwRI (RAD instrument team): first radiation measurements from the surface of Mars",
      url: "https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars",
    },
    observed:
      "Inside the spacecraft on the trip to Mars, RAD measured an average of about 1.8 millisieverts per day from galactic cosmic rays. On the surface at Gale Crater, the RAD team reported an average of about 0.67 millisieverts per day. Mars has no global magnetic field and only a thin atmosphere, so more radiation reaches the ground than on Earth.",
    simplified:
      "Our Radiation Hazard meter (0–100) is a made-up score, not a dose in millisieverts. It rises a little every sol and more during a solar particle event. The shelter multipliers (×0.70, ×0.45, ×0.25) are game balance numbers, not NASA calculations.",
    mechanic: "Game link: Radiation Shelter upgrades and the Solar Particle Warning decision.",
  },
  {
    id: "dust",
    title: "Dust storms and solar power",
    mission: "Mars Exploration Rover Opportunity (solar powered) — sky opacity “tau” measurements",
    context: "Planet-encircling dust storm, June 2018, Perseverance Valley",
    sourceTitle: "NASA JPL: Six Things About Opportunity's Recovery Efforts",
    sourceUrl: "https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/",
    observed:
      "Scientists describe how much dust is in the Martian sky with a number called tau: the higher the tau, the less sunlight reaches the ground. A typical tau at Opportunity's site was about 0.5. On June 10, 2018 the rover measured a tau of 10.8, and engineers estimated it needed a tau below 2.0 to recharge its batteries.",
    simplified:
      "We do not use tau. The game has just three sky conditions: clear (×1.0), dusty (×0.75) and dust storm (×0.40). Real storms can last weeks; ours last 1–2 sols so the game stays short.",
    mechanic: "Game link: weather multipliers on the Solar Array, the Dust Storm and Dusty Solar Panels decisions.",
  },
  {
    id: "water",
    title: "Recycling water in space",
    mission: "International Space Station — Environmental Control and Life Support System (ECLSS)",
    context: "Announced June 2023, in Earth orbit (not on Mars)",
    sourceTitle: "NASA: NASA Achieves Water Recovery Milestone on International Space Station",
    sourceUrl:
      "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
    observed:
      "The space station's life support system showed it can recover about 98% of the water the crew brings on board, up from 93–94% before a new Brine Processor Assembly was added. It collects moisture from breath and sweat and cleans urine so the water can be used again.",
    simplified:
      "Our Life Support meter mixes air and water into one number from 0 to 100. Each sol Laika uses some and the Life Support Unit “recovers” a fixed amount. Real recycling is measured in percent recovered, and no Mars outpost has run such a system yet.",
    mechanic: "Game link: Life Support Unit upgrades and the Water Recycler Failure decision.",
  },
  {
    id: "laika",
    title: "The real Laika",
    mission: "Sputnik 2 (Soviet Union) — history, as described by NASA's StarChild site",
    context: "Launched to Earth orbit on November 3, 1957",
    sourceTitle: "NASA GSFC StarChild: Laika, the first dog in space",
    sourceUrl: "https://starchild.gsfc.nasa.gov/docs/StarChild/space_level2/laika.html",
    observed:
      "Laika was the first animal to orbit Earth, riding in Sputnik 2 in November 1957. The spacecraft was not built to come back, and the real Laika did not survive her mission.",
    simplified:
      "Our story is alternate history. In the game Laika is rescued and, many years later, helps prepare a Mars outpost. That never happened. We tell it this way to honor her and to imagine a kinder ending.",
    mechanic: "Game link: the whole story. Even when a mission fails, Laika is always evacuated safely.",
  },
];

export const SCIENCE_DISCLAIMER =
  "LAIKA: MISSION RED PLANET is a student project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA. All game numbers are fictional units.";
