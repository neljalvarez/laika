// NASA Science Lab cards. Every observed fact below was checked against the
// linked official source on 2026-11-14 and re-checked on 2026-11-15. "observed" = what the source reports;
// "simplified" = what our fictional game does with the idea.
// Game numbers are fictional units and are never NASA measurements.
import type { IconName } from "@/components/pixel/sprites";
import type { ModuleId } from "@/game/types";

export interface Source {
  title: string;
  url: string;
  /** Publisher or office, e.g. "NASA JPL". */
  publisher: string;
  /** Publication date or period as given by the source. */
  date: string;
}

export interface ScienceCard {
  id: string;
  title: string;
  icon: IconName;
  /** One or two short sentences a 7–12 year old can read. */
  simple: string;
  /** Verified finding, in plain words, attributed to the source. */
  observed: string;
  /** How the game simplifies the science. */
  simplified: string;
  /** Which game mechanic this card explains. */
  mechanic: string;
  modules: ModuleId[];
  /** Optional extra detail, shown only when expanded. */
  details: string;
  sources: Source[];
}

export const SCIENCE_CARDS: ScienceCard[] = [
  {
    id: "power",
    title: "Power on Mars",
    icon: "power",
    simple:
      "Solar panels turn sunlight into electricity. Dust in the sky blocks sunlight, and dust on the panels blocks even more. Batteries save energy for dark or dusty times.",
    observed:
      "During a planet-wide dust storm in June 2018, NASA's solar-powered Opportunity rover measured a sky darkness (“tau”) of 10.8. A normal value at its site was about 0.5, and engineers estimated it needed tau below 2.0 to recharge its batteries.",
    simplified:
      "The game has three sky types instead of tau: clear (×1.0), dusty (×0.75) and dust storm (×0.40). Real storms can last weeks; ours last 1–2 sols.",
    mechanic: "Solar Array output, Battery Station storage, and the Dust Storm and Dusty Panels decisions.",
    modules: ["solar", "battery"],
    details:
      "“Tau” measures how much dust is in the air above the rover. The higher it is, the less sunlight gets through. Opportunity stopped communicating on June 10, 2018, after the storm cut its power.",
    sources: [
      {
        title: "Six Things About Opportunity's Recovery Efforts",
        url: "https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/",
        publisher: "NASA JPL",
        date: "Aug. 16, 2018",
      },
    ],
  },
  {
    id: "radiation",
    title: "Surviving Space Radiation",
    icon: "radiation",
    simple:
      "Mars has no global magnetic field and only a thin atmosphere, so more space radiation reaches the ground. Thick shielding and safe shelters help protect explorers.",
    observed:
      "NASA's Curiosity rover carries a Radiation Assessment Detector (RAD). Inside the spacecraft on the way to Mars it measured about 1.8 millisieverts per day; on the surface at Gale Crater the RAD team reported about 0.67 millisieverts per day (Aug. 2012 – June 2013).",
    simplified:
      "Our Rad Hazard meter (0–100) is a made-up risk score, not a dose in millisieverts. The shelter multipliers (×0.70, ×0.45, ×0.25) are game balance numbers, not NASA calculations.",
    mechanic: "Radiation Shelter upgrades and the Solar Particle Warning decision.",
    modules: ["shelter"],
    details:
      "A millisievert is a unit for how much radiation affects the human body. Sudden bursts from the Sun (solar particle events) are one reason crews plan for a protected shelter.",
    sources: [
      {
        title: "Data From NASA Rover's Voyage to Mars Aids Planning",
        url: "https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/",
        publisher: "NASA JPL",
        date: "May 30, 2013",
      },
      {
        title: "SwRI scientists publish first radiation measurements from the surface of Mars",
        url: "https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars",
        publisher: "Southwest Research Institute (RAD instrument team)",
        date: "Dec. 9, 2013",
      },
    ],
  },
  {
    id: "water",
    title: "Recycling Air and Water",
    icon: "lifeSupport",
    simple:
      "Far from Earth, crews can't get fresh water delivered every day. Recycling machines clean used water so it can be used again and again.",
    observed:
      "On the International Space Station, NASA's life support system showed it can recover about 98% of the water crews bring aboard, up from 93–94% before a Brine Processor Assembly was added.",
    simplified:
      "Our Life Support meter mixes air and water into one number. This was shown on the space station in Earth orbit; no recycling system like it is running on Mars yet.",
    mechanic: "Life Support Unit recovery, Habitat leaks, and the Water Recycler Failure decision.",
    modules: ["lifeSupport", "habitat"],
    details:
      "The system collects moisture from the air (from breathing and sweat) and cleans used water. Reliable recycling means less has to be launched from Earth.",
    sources: [
      {
        title: "NASA Achieves Water Recovery Milestone on International Space Station",
        url: "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station",
        publisher: "NASA",
        date: "June 2023",
      },
    ],
  },
  {
    id: "food",
    title: "Growing Food in Space",
    icon: "food",
    simple:
      "Plants in space need a controlled home: the right light, water and air. That takes electricity and space, and crops take time to grow.",
    observed:
      "NASA's Veggie plant chamber on the space station grows crops under a panel of red, blue and green LEDs. Its growing area is 11.5 by 14.5 inches, and checking that the food is safe to eat was a main goal of its first test.",
    simplified:
      "Our greenhouse needs 2 powered sols before the first harvest and uses 3 or 7 power. Real crops take weeks, and the numbers are game units.",
    mechanic: "Greenhouse OFF / LOW / HIGH modes, crop growing time, and the Lamp Fault decision.",
    modules: ["greenhouse"],
    details:
      "On the space station, room is very limited, so the plant chamber had to be small and fold up. Grow lights use electricity, which is why our greenhouse competes with other systems for power.",
    sources: [
      {
        title: "Veggie Will Expand Fresh Food Production on Space Station",
        url: "https://www.nasa.gov/mission_pages/station/research/news/veggie",
        publisher: "NASA",
        date: "Apr. 10, 2014",
      },
    ],
  },
  {
    id: "reliability",
    title: "Building a Reliable Outpost",
    icon: "materials",
    simple:
      "On Mars there is no repair shop. Engineers plan for failures, choose systems that keep working in bad weather, and decide carefully where limited supplies go.",
    observed:
      "In its 2024 Moon to Mars architecture review, NASA chose nuclear fission as the main power source for future crewed Mars missions. One reason: atmospheric dust can reduce the sunlight that reaches solar arrays, and long dust storms would cut solar power for a long time.",
    simplified:
      "Our outpost uses solar power only, and has one build per sol. Choosing between upgrading and repairing is our simple version of a real engineering trade-off.",
    mechanic: "The Engineering tab (one upgrade or repair per sol), wear on buildings, and limited materials.",
    modules: ["habitat", "battery", "solar"],
    details:
      "The same review notes that solar panels would need batteries to work at night and ways to remove dust, and that limited repair options on Mars make sturdy systems important.",
    sources: [
      {
        title: "Mars Surface Power Technology Decision (2024 Architecture Concept Review)",
        url: "https://www.nasa.gov/wp-content/uploads/2024/12/acr24-mars-surface-power-decision.pdf",
        publisher: "NASA",
        date: "2024",
      },
    ],
  },
  {
    id: "laika",
    title: "The Real Laika",
    icon: "warning",
    simple: "Laika was a real dog. Our Mars story about her is made up.",
    observed:
      "Laika was the first animal to orbit Earth, riding in the Soviet Sputnik 2 spacecraft in November 1957. The spacecraft was not built to return, and she did not survive the mission.",
    simplified:
      "Our story is alternate history. In the game Laika is rescued and later helps prepare a Mars outpost. That never happened; we tell it to honor her and imagine a kinder ending.",
    mechanic: "The whole story. Even when a mission fails, game-Laika is always evacuated safely.",
    modules: [],
    details: "NASA's StarChild page for students describes her 1957 flight.",
    sources: [
      {
        title: "Laika, the first dog in space",
        url: "https://starchild.gsfc.nasa.gov/docs/StarChild/space_level2/laika.html",
        publisher: "NASA GSFC StarChild",
        date: "accessed 2026",
      },
    ],
  },
];

export function scienceCard(id: string): ScienceCard | undefined {
  return SCIENCE_CARDS.find((c) => c.id === id);
}

export const SCIENCE_DISCLAIMER =
  "LAIKA: MISSION RED PLANET is a student project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA. All game numbers are fictional units.";
