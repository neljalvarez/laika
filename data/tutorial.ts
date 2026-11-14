// Authored tutorial script. Each stage waits for a real player action unless
// it is informational ("next"). Kept very short for ages 7–12.
export interface TutorialStage {
  title: string;
  lines: string[];
  /** What the player must do. */
  task: string;
  /** Informational stage advanced with a button instead of an action. */
  next?: string;
}

export const TUTORIAL_STAGES: TutorialStage[] = [
  {
    title: "Welcome to Mars",
    lines: ["Welcome, Commander! I'm Laika. This is our Mars outpost!", "Keep it working for 10 sols so the crew can come."],
    task: "Press BEGIN TRAINING.",
    next: "Begin Training",
  },
  {
    title: "Solar Array",
    lines: ["These are our solar panels! Click them to see how we get power."],
    task: "Click the SOLAR ARRAY.",
  },
  {
    title: "Resource Meters",
    lines: ["These meters show how we are doing.", "They change every sol. Keep Rad Hazard low and the others high!"],
    task: "Press NEXT.",
    next: "Next",
  },
  {
    title: "Greenhouse",
    lines: ["The greenhouse grows food, but it needs power!"],
    task: "Click the GREENHOUSE.",
  },
  {
    title: "Preview",
    lines: ["Before the day ends, let's check what will happen."],
    task: "Press PREVIEW NEXT SOL.",
  },
  {
    title: "Begin the Mission",
    lines: ["You're ready, Commander! Let's begin our mission!"],
    task: "Press ADVANCE SOL.",
  },
];

export const TUTORIAL_TRADEOFF_LINE = "Every choice has a cost. More power for one thing means less for another.";
