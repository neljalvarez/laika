// Authored mission events. Every choice has a mechanical consequence and a
// short science explanation. Numbers are fictional game units.
import type { MissionEvent, EventId } from "@/game/types";

export const EVENTS: Record<EventId, MissionEvent> = {
  dust_storm: {
    id: "dust_storm",
    title: "Dust Storm Incoming",
    icon: "warning",
    description:
      "A wall of dust is rolling over the outpost. Less sunlight will reach the solar panels until it passes.",
    minSol: 4,
    maxSol: 9,
    weight: 3,
    choices: [
      {
        id: "conserve",
        label: "Conserve power",
        description: "Switch off the greenhouse and other nonessential loads until the storm passes.",
        cost: {},
        effects: [
          { id: "storm_conserve", label: "Nonessential systems off", solsLeft: 2, nonessentialOff: true },
        ],
        nearTerm: "Greenhouse is off for 2 sols, saving power.",
        future: "No harvest while it is off.",
        science:
          "When less energy comes in, engineers shut down what the crew can live without so air and water systems keep running.",
        quality: 0.8,
      },
      {
        id: "maintain",
        label: "Protect and sweep panels",
        description: "Use materials to brace the panels and keep brushing the dust away.",
        cost: { materials: 8 },
        effects: [{ id: "storm_maintain", label: "Panels kept clean", solsLeft: 2, solarMult: 1.6 }],
        repair: { solar: 10 },
        nearTerm: "Solar output stays much higher during the storm.",
        future: "8 fewer materials for upgrades.",
        science:
          "Dust in the sky blocks sunlight, and dust on the panels blocks even more. Cleaning removes the part you can control.",
        quality: 1,
      },
      {
        id: "accept",
        label: "Ride it out",
        description: "Change nothing and let the batteries cover the gap.",
        cost: {},
        damage: { solar: 12 },
        nearTerm: "Solar output drops to 40% and panels get scratched.",
        future: "Damaged panels make less power until repaired.",
        science:
          "Batteries store energy for dark times, but they only last so long. Gritty dust also wears down equipment.",
        quality: 0.3,
      },
    ],
  },

  solar_radiation: {
    id: "solar_radiation",
    title: "Solar Particle Warning",
    icon: "radiation",
    description:
      "Mission Control warns that a burst of fast particles from the Sun will reach Mars today. Mars has no global magnetic field to block it.",
    minSol: 4,
    maxSol: 9,
    weight: 3,
    choices: [
      {
        id: "shelter",
        label: "Send Laika to the shelter",
        description: "Laika waits in the Radiation Shelter. Greenhouse work pauses for 1 sol.",
        cost: {},
        radiation: { amount: 8, shielded: true },
        effects: [
          {
            id: "sheltering",
            label: "Laika sheltering",
            solsLeft: 1,
            nonessentialOff: true,
            sheltering: true,
          },
        ],
        nearTerm: "Small hazard increase, reduced by your shelter level.",
        future: "No harvest this sol.",
        science:
          "Thick shielding stops many fast particles. Waiting in a protected room during a solar event is a real spaceflight safety plan.",
        quality: 0.9,
      },
      {
        id: "reinforce",
        label: "Reinforce the shielding",
        description: "Pile extra material on the shelter walls, then shelter.",
        cost: { materials: 10 },
        radiation: { amount: 4, shielded: true },
        effects: [
          { id: "reinforced", label: "Extra shielding", solsLeft: 3, radMult: 0.6, sheltering: true },
        ],
        repair: { shelter: 10 },
        nearTerm: "Smallest hazard increase. Greenhouse keeps running.",
        future: "Lower hazard for 3 sols, but 10 fewer materials.",
        science:
          "More mass between you and space means more protection. On Mars, builders could even use local soil as shielding.",
        quality: 1,
      },
      {
        id: "stay",
        label: "Stay in the habitat",
        description: "Keep working as normal with only the thin habitat walls for protection.",
        cost: {},
        radiation: { amount: 26, shielded: false },
        nearTerm: "Large radiation hazard increase (+26).",
        future: "The hazard meter never goes back down.",
        science:
          "Radiation risk adds up over time. Skipping protection saves effort today but the exposure cannot be undone.",
        quality: 0.2,
      },
    ],
  },

  water_recycler: {
    id: "water_recycler",
    title: "Water Recycler Failure",
    icon: "lifeSupport",
    description:
      "A pump in the Life Support Unit has jammed. Dirty water is no longer being cleaned and reused.",
    minSol: 4,
    maxSol: 9,
    weight: 3,
    choices: [
      {
        id: "repair",
        label: "Repair the pump now",
        description: "Build a replacement part from construction materials.",
        cost: { materials: 8 },
        nearTerm: "Recycling keeps working normally.",
        future: "8 fewer materials for upgrades.",
        science:
          "Far from Earth, crews must fix things with what they have. Recycling water means much less has to be launched.",
        quality: 1,
      },
      {
        id: "reserves",
        label: "Use reserve water",
        description: "Flush the system with stored water to clear the jam.",
        cost: { lifeSupport: 12 },
        nearTerm: "Life-support reserve drops by 12.",
        future: "The unit is fine afterwards.",
        science:
          "Reserves are a safety margin. Spending them solves today's problem but leaves less room for the next surprise.",
        quality: 0.5,
      },
      {
        id: "cut",
        label: "Cut nonessential water use",
        description: "Turn off greenhouse irrigation and run the recycler at half speed.",
        cost: {},
        damage: { lifeSupport: 15 },
        effects: [
          {
            id: "recycler_limp",
            label: "Recycler at half speed",
            solsLeft: 2,
            nonessentialOff: true,
            lsRecoveryMult: 0.6,
          },
        ],
        nearTerm: "Greenhouse off and slower recycling for 2 sols.",
        future: "Life Support Unit stays damaged until repaired.",
        science:
          "Running damaged equipment gently can buy time, but it does less work and still needs a real repair later.",
        quality: 0.6,
      },
    ],
  },

  panel_dust: {
    id: "panel_dust",
    title: "Dusty Solar Panels",
    icon: "power",
    description:
      "A fine layer of dust has settled on the Solar Array. The panels are making less electricity than they should.",
    minSol: 2,
    maxSol: 7,
    weight: 3,
    choices: [
      {
        id: "clean",
        label: "Clean the panels",
        description: "Use a little material to build a brush tool and sweep them.",
        cost: { materials: 4 },
        repair: { solar: 6 },
        nearTerm: "Full solar output right away.",
        future: "4 fewer materials.",
        science:
          "Solar panels need light to reach them. Dust acts like a shade, so clean panels turn more sunlight into electricity.",
        quality: 1,
      },
      {
        id: "tolerate",
        label: "Leave the dust",
        description: "Accept lower output and hope the wind clears it.",
        cost: {},
        damage: { solar: 8 },
        effects: [{ id: "dusty_panels", label: "Dusty panels", solsLeft: 3, solarMult: 0.8 }],
        nearTerm: "Solar output is 20% lower for 3 sols.",
        future: "Panels lose some condition.",
        science:
          "Wind on Mars has sometimes cleaned rover panels, but nobody can plan on it. Waiting is a gamble.",
        quality: 0.4,
      },
      {
        id: "batteries",
        label: "Lean on the batteries",
        description: "Leave the dust but switch off nonessential loads so the batteries last.",
        cost: {},
        effects: [
          {
            id: "dusty_saver",
            label: "Dusty panels, power saving",
            solsLeft: 2,
            solarMult: 0.8,
            nonessentialOff: true,
          },
        ],
        nearTerm: "Lower output and greenhouse off for 2 sols.",
        future: "No panel damage, but no harvest either.",
        science:
          "Using less is another way to balance an energy budget when you cannot make more.",
        quality: 0.6,
      },
    ],
  },

  habitat_malfunction: {
    id: "habitat_malfunction",
    title: "Habitat Air Seal Leak",
    icon: "warning",
    description:
      "A door seal on the Habitat is leaking a little air. It is safe for now, but air is slowly escaping.",
    minSol: 4,
    maxSol: 9,
    weight: 3,
    choices: [
      {
        id: "repair",
        label: "Replace the seal",
        description: "Make a new seal from construction materials.",
        cost: { materials: 7 },
        nearTerm: "Leak fixed. No air lost.",
        future: "7 fewer materials.",
        science:
          "A habitat is a bubble of air in a place with almost none. Keeping it sealed is the most basic job of all.",
        quality: 1,
      },
      {
        id: "reduced",
        label: "Close off that room",
        description: "Seal the inner door and live in a smaller space.",
        cost: {},
        damage: { habitat: 25 },
        nearTerm: "Habitat condition drops by 25.",
        future: "A damaged habitat uses more life support each sol.",
        science:
          "Closing a section keeps everyone safe, but the outpost is less ready for the human crew.",
        quality: 0.5,
      },
      {
        id: "reroute",
        label: "Pump in extra air",
        description: "Use power and reserve air to make up for the leak.",
        cost: { power: 8, lifeSupport: 6 },
        damage: { habitat: 8 },
        nearTerm: "Costs 8 power and 6 life support now.",
        future: "Small lasting damage to the habitat.",
        science:
          "You can cover a leak by supplying more air, but that spends energy and reserves instead of fixing the cause.",
        quality: 0.6,
      },
    ],
  },

  greenhouse_fault: {
    id: "greenhouse_fault",
    title: "Greenhouse Lamp Fault",
    icon: "food",
    description:
      "The grow lamps are flickering and the greenhouse is getting cold. The plants need steady light and warmth.",
    minSol: 2,
    maxSol: 8,
    weight: 3,
    choices: [
      {
        id: "divert",
        label: "Divert power to restart",
        description: "Send a burst of battery power to reheat and restart the lamps.",
        cost: { power: 8 },
        nearTerm: "Costs 8 power. Crops are unharmed.",
        future: "Harvest continues as planned.",
        science:
          "Plants turn light into food. On Mars a greenhouse must make its own light and heat, and that takes electricity.",
        quality: 1,
      },
      {
        id: "accept",
        label: "Run on dim lamps",
        description: "Let the greenhouse limp along with weak light.",
        cost: {},
        damage: { greenhouse: 10 },
        effects: [{ id: "dim_lamps", label: "Dim grow lamps", solsLeft: 3, foodMult: 0.5 }],
        nearTerm: "Half harvest for 3 sols.",
        future: "Greenhouse loses some condition.",
        science: "Less light means slower growth. Plants cannot make food faster than their energy supply allows.",
        quality: 0.5,
      },
      {
        id: "stored",
        label: "Rely on stored food",
        description: "Shut the lamps down for a slow, careful restart.",
        cost: {},
        effects: [{ id: "lamp_restart", label: "Lamps restarting", solsLeft: 2, foodMult: 0 }],
        nearTerm: "No harvest for 2 sols.",
        future: "Lamps come back at full strength, no damage.",
        science: "Stored food is a buffer. It gives engineers time to fix problems without rushing.",
        quality: 0.6,
      },
    ],
  },

  resupply: {
    id: "resupply",
    title: "Supply Drone Landing",
    icon: "materials",
    description:
      "A small cargo drone from orbit has landed nearby. Its rover can carry only one crate back before the wind picks up.",
    minSol: 5,
    maxSol: 8,
    weight: 2,
    choices: [
      {
        id: "materials",
        label: "Building materials",
        description: "Bring back the crate of spare parts.",
        cost: {},
        gain: { materials: 12 },
        nearTerm: "+12 materials.",
        future: "More upgrades or repairs possible.",
        science: "Every kilogram sent to Mars is expensive, so supplies are limited and choices matter.",
        quality: 1,
      },
      {
        id: "food",
        label: "Food packs",
        description: "Bring back the crate of packaged food.",
        cost: {},
        gain: { food: 6 },
        nearTerm: "+6 food.",
        future: "Extra time before the harvest matters.",
        science: "Packaged food is reliable, but growing food on site means less must be shipped.",
        quality: 1,
      },
      {
        id: "air",
        label: "Air and water tanks",
        description: "Bring back the crate of air and water canisters.",
        cost: {},
        gain: { lifeSupport: 12 },
        nearTerm: "+12 life support.",
        future: "A bigger safety margin.",
        science: "Air and water are the hardest things to do without, so reserves are always valuable.",
        quality: 1,
      },
    ],
  },
};

export const EVENT_LIST: MissionEvent[] = Object.values(EVENTS);
