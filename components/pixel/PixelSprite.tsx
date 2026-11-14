import { memo, type ReactElement } from "react";
import { NO_OUTLINE, PALETTE, TRANSLUCENT, type Grid } from "./sprites";

interface Run {
  x: number;
  y: number;
  w: number;
  ch: string;
}

/** Merge horizontal runs of the same colour into single rects. */
function runs(grid: Grid): Run[] {
  const out: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== ".") out.push({ x, y, w, ch });
      x += w;
    }
  });
  return out;
}

/** Adds a 1px dark outline around the silhouette (grid grows by 1px each side). */
export function outlined(grid: Grid): Grid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const ch = grid[y][x];
    return ch !== "." && !NO_OUTLINE.has(ch);
  };
  const rows: string[] = [];
  for (let y = -1; y <= h; y++) {
    let row = "";
    for (let x = -1; x <= w; x++) {
      const inside = x >= 0 && y >= 0 && x < w && y < h;
      const ch = inside ? grid[y][x] : ".";
      if (ch !== ".") row += ch;
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) row += "N";
      else row += ".";
    }
    rows.push(row);
  }
  return rows;
}

export function gridRects(grid: Grid, keyPrefix = ""): ReactElement[] {
  return runs(grid).map((r) => (
    <rect
      key={`${keyPrefix}${r.x}-${r.y}`}
      x={r.x}
      y={r.y}
      width={r.w}
      height={1}
      fill={PALETTE[r.ch] ?? "#ff00ff"}
      fillOpacity={TRANSLUCENT.has(r.ch) ? 0.55 : 1}
    />
  ));
}

interface PixelSpriteProps {
  grid: Grid;
  /** CSS pixels per sprite pixel. */
  scale?: number;
  outline?: boolean;
  title?: string;
  className?: string;
}

/** Renders a sprite grid as crisp SVG pixel art. */
function PixelSpriteImpl({ grid, scale = 2, outline = false, title, className }: PixelSpriteProps) {
  const g = outline ? outlined(grid) : grid;
  const w = g[0]?.length ?? 0;
  const h = g.length;
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ imageRendering: "pixelated", flex: "none" }}
    >
      {gridRects(g)}
    </svg>
  );
}

export const PixelSprite = memo(PixelSpriteImpl);
