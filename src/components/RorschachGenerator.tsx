import { useRef, useState } from "react";

function drawRorschach(colors: string[], canvas: HTMLCanvasElement) {
  const W = canvas.width;
  const H = canvas.height;
  const hw = Math.floor(W / 2);
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, hw, H);
  ctx.clip();
  ctx.globalAlpha = 1;

  // ── Shape primitives ────────────────────────────────────────────────────
  // All shapes only set up the path; the caller calls ctx.fill().
  // No ctx.save/restore inside shapes — rotation is done with manual math
  // so the CTM is unchanged between path creation and fill().

  // Smooth organic blob
  function blob(cx: number, cy: number, r: number) {
    const n = 6 + Math.floor(Math.random() * 5);
    const pts: [number, number][] = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const ri = r * (0.45 + Math.random() * 0.85);
      return [cx + Math.cos(a) * ri, cy + Math.sin(a) * ri];
    });
    ctx.beginPath();
    ctx.moveTo(
      (pts[0][0] + pts[n - 1][0]) / 2,
      (pts[0][1] + pts[n - 1][1]) / 2
    );
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      ctx.quadraticCurveTo(
        pts[i][0],
        pts[i][1],
        (pts[i][0] + pts[j][0]) / 2,
        (pts[i][1] + pts[j][1]) / 2
      );
    }
    ctx.closePath();
  }

  // Sharp irregular polygon (triangle → heptagon)
  /* function polygon(cx: number, cy: number, r: number) {
    const n = 3 + Math.floor(Math.random() * 5);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / n);
      const ri = r * (0.4 + Math.random() * 0.9);
      const x = cx + Math.cos(a) * ri;
      const y = cy + Math.sin(a) * ri;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  } */

  // Long thin angular shard — rotation done with manual trig, no CTM changes
  /*   function shard(cx: number, cy: number, r: number) {
    const angle = Math.random() * Math.PI * 2;
    const len = r * (2.5 + Math.random() * 3.5);
    const w = r * (0.1 + Math.random() * 0.28);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    function tr(lx: number, ly: number): [number, number] {
      return [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
    }
    ctx.beginPath();
    let [x, y] = tr(-len / 2, (Math.random() - 0.5) * w * 0.3);
    ctx.moveTo(x, y);
    [x, y] = tr(-len * 0.08, -w / 2);
    ctx.lineTo(x, y);
    [x, y] = tr(len / 2, (Math.random() - 0.5) * w * 0.3);
    ctx.lineTo(x, y);
    [x, y] = tr(len * 0.08, w / 2);
    ctx.lineTo(x, y);
    ctx.closePath();
  } */

  // Sharp star / spiky shape
  /* function spiky(cx: number, cy: number, r: number) {
    const points = 4 + Math.floor(Math.random() * 4);
    const inner = r * (0.12 + Math.random() * 0.28);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const ri = i % 2 === 0 ? r * (0.75 + Math.random() * 0.5) : inner;
      const x = cx + Math.cos(a) * ri;
      const y = cy + Math.sin(a) * ri;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  } */

  // Jagged polygon: sharp straight edges
  /* function jagged(cx: number, cy: number, r: number) {
    const n = 8 + Math.floor(Math.random() * 6);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ri = r * (0.35 + Math.random() * 1.0); // high variance for jaggedness
      const x = cx + Math.cos(a) * ri;
      const y = cy + Math.sin(a) * ri;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  } */

  function pickAndDraw(cx: number, cy: number, r: number) {
    const roll = Math.random();
    blob(cx, cy, r);
    // else if (roll < 0.42) polygon(cx, cy, r);
    // else if (roll < 0.6) shard(cx, cy, r);
    // else if (roll < 0.78) spiky(cx, cy, r);
    // else jagged(cx, cy, r);
  }

  // ── Build shape list, sort large → small ────────────────────────────────
  // Smaller shapes render last = on top, creating visual depth without opacity.

  const totalShapes = 65 + colors.length * 5;

  type Shape = { color: string; cx: number; cy: number; r: number };
  const shapes: Shape[] = Array.from({ length: totalShapes }, (_, i) => {
    const t = i / totalShapes;
    // Large shapes (first 15%): scattered across the whole half
    // Medium shapes (next 45%): biased toward the center fold for a dense "body"
    // Small shapes (last 40%): freely scattered for texture
    const r =
      t < 0.15
        ? hw * (0.22 + Math.random() * 0.44)
        : t < 0.6
        ? hw * (0.06 + Math.random() * 0.2)
        : hw * (0.012 + Math.random() * 0.065);

    const biasCenter = t >= 0.15 && t < 0.6 && Math.random() < 0.55;
    const cx = biasCenter
      ? hw * (0.35 + Math.random() * 0.65)
      : Math.random() * hw;
    const cy = H * (0.04 + Math.random() * 0.92);

    return { color: colors[i % colors.length], cx, cy, r };
  }).sort((a, b) => b.r - a.r); // large first → small on top

  shapes.forEach(({ color, cx, cy, r }) => {
    ctx.fillStyle = color;
    pickAndDraw(cx, cy, r);
    ctx.fill();
  });

  ctx.restore();

  // ── Mirror left half onto right half ────────────────────────────────────
  const leftData = ctx.getImageData(0, 0, hw, H);
  const rightData = new ImageData(hw, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < hw; x++) {
      const s = (y * hw + x) * 4;
      const d = (y * hw + (hw - 1 - x)) * 4;
      rightData.data[d] = leftData.data[s];
      rightData.data[d + 1] = leftData.data[s + 1];
      rightData.data[d + 2] = leftData.data[s + 2];
      rightData.data[d + 3] = leftData.data[s + 3];
    }
  }
  ctx.putImageData(rightData, hw, 0);
}

export default function RorschachGenerator({
  colors,
  onGenerate,
}: {
  colors: string[];
  onGenerate?: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  function generate() {
    const canvas = canvasRef.current!;
    canvas.width = 900;
    canvas.height = 500;
    drawRorschach(colors, canvas);
    setGenerated(true);

    // Apply as page background with a tinted overlay so content stays readable
    const dataUrl = canvas.toDataURL("image/png");
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const overlay = dark ? "rgba(22,23,29,0.78)" : "rgba(255,255,255,0.78)";
    document.body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), url(${dataUrl})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    onGenerate?.(dataUrl);
  }

  function download() {
    const a = document.createElement("a");
    a.download = "rorschach.png";
    a.href = canvasRef.current!.toDataURL("image/png");
    a.click();
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "var(--text-h)",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          Rorschach
        </h2>
        <button
          onClick={generate}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {generated ? "Regenerate" : "Generate"}
        </button>
        {generated && (
          <button
            onClick={download}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: "var(--bg)",
              color: "var(--text-h)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Download PNG
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{
          display: generated ? "block" : "none",
          maxWidth: "100%",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      />
    </div>
  );
}
