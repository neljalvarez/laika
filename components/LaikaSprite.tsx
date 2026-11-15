import { gridRects, outlined } from "./pixel/PixelSprite";
import { LAIKA_FRAMES, LAIKA_WALK_FRAMES, PALETTE, talkFrames, withGear, type GearItem, type LaikaVariant } from "./pixel/sprites";

const MOOD_LABEL: Record<LaikaVariant, string> = {
  idle: "Laika, calm",
  happy: "Laika, happy",
  concerned: "Laika, worried",
  alert: "Laika, alert",
  resting: "Laika, resting",
  celebrate: "Laika, celebrating",
};

interface FramesProps {
  mood: LaikaVariant;
  /** Short walk cycle with alternating paws while Laika changes position. */
  walking?: boolean;
  /** Cosmetic gear earned by reaching new sols. */
  gear?: GearItem[];
  /** Mouth opens and closes while Laika is speaking. */
  talking?: boolean;
}

/**
 * Two sprite frames stacked; CSS swaps them in discrete steps (globals.css).
 * Idle adds a separate blink layer and pauses between tail wags.
 */
export function LaikaFrames({ mood, walking = false, gear = [], talking = false }: FramesProps) {
  const base = walking ? LAIKA_WALK_FRAMES : LAIKA_FRAMES[mood];
  const [rawA, rawB] = talking && !walking ? talkFrames(base[0]) : base;
  const a = withGear(rawA, gear);
  const b = withGear(rawB, gear);
  const cls = walking ? "laika-walk" : talking ? "laika-talk" : `laika-${mood}`;
  return (
    <g className={`laika ${cls}`}>
      <g className="laika-frame-a">{gridRects(outlined(a), "a")}</g>
      <g className="laika-frame-b">{gridRects(outlined(b), "b")}</g>
      {mood === "idle" && !walking && !talking && (
        // Closed eyes drawn over the open ones (outlined grid is offset by 1px).
        <g className="laika-blink">
          <rect x={9} y={8} width={1} height={1} fill={PALETTE.O} />
          <rect x={16} y={8} width={1} height={1} fill={PALETTE.O} />
          <rect x={9} y={9} width={1} height={1} fill={PALETTE.N} />
          <rect x={16} y={9} width={1} height={1} fill={PALETTE.N} />
        </g>
      )}
    </g>
  );
}

interface SpriteProps {
  mood: LaikaVariant;
  scale?: number;
  /** Extra animation class for the whole sprite, e.g. a brief bounce. */
  motion?: string;
  gear?: GearItem[];
  talking?: boolean;
}

/** Standalone Laika portrait (26×26 sprite pixels including outline). */
export function LaikaSprite({ mood, scale = 4, motion, gear = [], talking = false }: SpriteProps) {
  return (
    <svg
      width={26 * scale}
      height={26 * scale}
      viewBox="0 0 26 26"
      shapeRendering="crispEdges"
      role="img"
      aria-label={MOOD_LABEL[mood]}
      style={{ imageRendering: "pixelated", flex: "none", overflow: "visible" }}
    >
      <g className={motion}>
        <LaikaFrames mood={mood} gear={gear} talking={talking} />
      </g>
    </svg>
  );
}
