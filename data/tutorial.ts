// Authored tutorial script. Each stage waits for a real player action unless
// it is marked informational ("next").
export interface TutorialStage {
  title: string;
  /** Laika's lines, kept short for ages 7–12. */
  lines: string[];
  /** What the player must do, shown as the call to action. */
  task: string;
  /** Informational stage advanced with a button instead of an action. */
  next?: string;
}

export const TUTORIAL_STAGES: TutorialStage[] = [
  {
    title: "Welcome to Mars",
    lines: [
      "Welcome, Commander! I'm Laika. This is our Mars outpost!",
      "Your mission is to keep our systems working and prepare the station for our future crew.",
    ],
    task: "You will manage Power, Life Support, Food, Materials and Rad Hazard: the five meters at the top.",
    next: "Begin Training",
  },
  {
    title: "Inspect the Solar Array",
    lines: ["Let's inspect our solar panels! They turn sunlight into electricity."],
    task: "Click the SOLAR ARRAY (the blue panels) in the outpost.",
  },
  {
    title: "Read the Resource Meters",
    lines: [
      "These meters show how our station is doing. Keep an eye on them!",
      "Power runs our equipment. Life Support is our air and water. Food keeps me fed. Materials build and fix things. Rad Hazard should stay low.",
    ],
    task: "The meters change each time you advance a sol.",
    next: "Next",
  },
  {
    title: "Operate the Greenhouse",
    lines: ["Our greenhouse grows food, but it needs electricity!"],
    task: "Click the GREENHOUSE, then pick OFF, LOW or HIGH.",
  },
  {
    title: "Preview the Next Sol",
    lines: ["Before ending the day, let's check what might happen to our supplies."],
    task: "Press PREVIEW NEXT SOL.",
  },
  {
    title: "Begin the Mission",
    lines: ["You're ready, Commander! Let's begin our mission!"],
    task: "Press ADVANCE SOL to finish this sol.",
  },
];

export const TUTORIAL_TRADEOFF_LINE =
  "Every choice has a cost. More electricity for one system means less for another.";
