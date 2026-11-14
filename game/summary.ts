// Picks the single most important plain-language message from a real sol report.
import type { SolReport } from "./types";

export interface SolHeadline {
  message: string;
  tone: "good" | "warn" | "bad";
}

export function summarizeReport(report: SolReport): SolHeadline {
  if (report.powerShortage) return { message: "Not enough power! Life support lost extra reserve.", tone: "bad" };
  if (report.foodShortage) return { message: "Food ran out! Laika used emergency rations.", tone: "bad" };
  if (report.weather === "STORM") return { message: "A dust storm blocked most of the sunlight.", tone: "warn" };
  if (report.weather === "DUSTY") return { message: "Dust reduced solar power today.", tone: "warn" };
  const notes = report.notes.join(" ");
  if (notes.includes("Crops are established")) return { message: "Crops are ready! Harvest starts next sol.", tone: "good" };
  if (notes.includes("still growing")) return { message: "Crops are still growing. No food harvest yet.", tone: "good" };
  if (notes.includes("Nonessential systems")) return { message: "The greenhouse was switched off to save power.", tone: "warn" };
  if (notes.includes("Battery was full")) return { message: "The battery was full, so some power was wasted.", tone: "warn" };
  if (notes.includes("Greenhouse is OFF")) return { message: "The greenhouse is off, so crops are not growing.", tone: "warn" };
  return { message: "A calm day. All systems worked.", tone: "good" };
}
