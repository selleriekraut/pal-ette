import chroma from "chroma-js";

export function generatePalette(color: string, type: string, count = 5) {
  const base = chroma(color);
  const max = Math.min(count, 9);

  if (type === "analogous") {
    const step = 30;
    const start = -Math.floor(max / 2);
    return Array.from({ length: max }, (_, i) =>
      base.set("hsl.h", (start + i) * step).hex()
    );
  }
  if (type === "complementary") {
    const complement = base.set("hsl.h", "+180");
    const variants = [
      base.darken(2).hex(),
      base.darken(1).hex(),
      base.hex(),
      base.brighten(1).hex(),
      base.brighten(2).hex(),
      complement.darken(2).hex(),
      complement.darken(1).hex(),
      complement.hex(),
      complement.brighten(1).hex(),
    ];
    return variants.slice(0, max);
  }
  if (type === "triadic") {
    const t1 = base.set("hsl.h", "+120");
    const t2 = base.set("hsl.h", "+240");
    const variants = [
      base.darken(1).hex(),
      base.hex(),
      base.brighten(1).hex(),
      t1.darken(1).hex(),
      t1.hex(),
      t1.brighten(1).hex(),
      t2.darken(1).hex(),
      t2.hex(),
      t2.brighten(1).hex(),
    ];
    return variants.slice(0, max);
  }

  return [base.hex()];
}
