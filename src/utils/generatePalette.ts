import chroma from "chroma-js";

export type SchemeType = "analogous" | "complementary" | "triadic" | "tetradic";

function buildPalette(
  roots: chroma.Color[],
  max: number,
  sorted: boolean
): string[] {
  const adjust = (c: chroma.Color, lvl: number): chroma.Color =>
    lvl > 0 ? c.brighten(lvl) : lvl < 0 ? c.darken(-lvl) : c;

  const priority = [0, 1, -1, 2, -2]
    .flatMap((level) => roots.map((root) => adjust(root, level).hex()))
    .slice(0, max);

  if (!sorted) return priority;

  return roots
    .flatMap((root) =>
      [-2, -1, 0, 1, 2].map((level) => adjust(root, level).hex())
    )
    .filter((h) => priority.includes(h));
}

export function generatePalette(
  color: string,
  type: SchemeType,
  count = 5,
  sorted = false
): string[] {
  const base = chroma(color);
  const max = Math.min(count, 12);

  if (type === "analogous") {
    const step = 30;
    const baseHue = base.get("hsl.h");
    // Start with the base color (i=0 → offset 0), then alternate outward:
    // i=1 → +30, i=2 → -30, i=3 → +60, i=4 → -60 …
    const colors = Array.from({ length: max }, (_, i) => {
      const half = Math.ceil(i / 2);
      const offset = i === 0 ? 0 : i % 2 === 1 ? half * step : -(half * step);
      const hue = (((baseHue + offset) % 360) + 360) % 360;
      return base.set("hsl.h", hue).hex();
    });
    if (sorted) {
      return [...colors].sort((a, b) => chroma(a).luminance() - chroma(b).luminance());
    }
    return colors;
  }

  if (type === "complementary") {
    return buildPalette([base, base.set("hsl.h", "+180")], max, sorted);
  }

  if (type === "triadic") {
    return buildPalette(
      [base, base.set("hsl.h", "+120"), base.set("hsl.h", "+240")],
      max,
      sorted
    );
  }

  if (type === "tetradic") {
    return buildPalette(
      [
        base,
        base.set("hsl.h", "+90"),
        base.set("hsl.h", "+180"),
        base.set("hsl.h", "+270"),
      ],
      max,
      sorted
    );
  }

  return [base.hex()];
}
