import { gridRects, outlined } from "./pixel/PixelSprite";
import { LAIKA_FRAMES, type LaikaVariant } from "./pixel/sprites";

const MOOD_LABEL: Record<LaikaVariant, string> = {
  idle: "Laika, calm",
  happy: "Laika, happy",
  concerned: "Laika, worried",
  alert: "Laika, alert",
  resting: "Laika, resting",
  celebrate: "Laika, celebrating",
};

/** The two frames stacked; CSS swaps them (see .laika-frame-a/b in globals.css). */
export function LaikaFrames({ mood }: { mood: LaikaVariant }) {
  const [a, b] = LAIKA_FRAMES[mood];
  return (
    <g className={`laika laika-${mood}`}>
      <g className="laika-frame-a">{gridRects(outlined(a), "a")}</g>
      <g className="laika-frame-b">{gridRects(outlined(b), "b")}</g>
    </g>
  );
}

/** Standalone Laika portrait (26×26 sprite pixels including outline). */
export function LaikaSprite({ mood, scale = 4 }: { mood: LaikaVariant; scale?: number }) {
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
      <LaikaFrames mood={mood} />
    </svg>
  );
}
