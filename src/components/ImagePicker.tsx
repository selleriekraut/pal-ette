import chroma from "chroma-js";
import { useRef, useState } from "react";

interface Props {
  onColorPick: (hex: string) => void;
}

export default function ImagePicker({ onColorPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasImage, setHasImage] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  function drawImage(file: File) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current!;
      const maxW = containerRef.current?.clientWidth ?? 640;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setHasImage(true);
    };
    img.src = url;
  }

  function sampleColor(e: React.MouseEvent<HTMLCanvasElement>): string {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
    const [r, g, b] = canvas.getContext("2d")!.getImageData(x, y, 1, 1).data;
    return chroma(r, g, b).hex();
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    setHoveredColor(sampleColor(e));
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    onColorPick(sampleColor(e));
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) drawImage(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) drawImage(file);
    e.target.value = "";
  }

  return (
    <div ref={containerRef} className="mt-10">
      <h2 className="text-lg font-semibold text-[var(--text-h)] mb-3">
        Pick from Image
      </h2>

      {/* Upload zone — shown only when no image is loaded */}
      {!hasImage && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer bg-[var(--code-bg)] hover:bg-[var(--accent-bg)]"
        >
          <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
          <span className="text-sm text-[var(--text-h)] font-medium">
            Drop an image or click to upload
          </span>
          <span className="text-xs text-[var(--text)] opacity-60 mt-1">
            Click any pixel to set it as the base color
          </span>
        </label>
      )}

      {/* Canvas section — always in DOM so ref is stable; hidden until image loaded */}
      <div className={hasImage ? "block" : "hidden"}>
        <div className="flex items-center gap-2 mb-2 h-6">
          {hoveredColor && (
            <>
              <div
                className="w-4 h-4 rounded-full border border-[var(--border)] flex-shrink-0"
                style={{ background: hoveredColor }}
              />
              <span className="font-mono text-xs text-[var(--text-h)]">
                {hoveredColor}
              </span>
            </>
          )}
          <label className="ml-auto text-xs text-[var(--accent)] cursor-pointer hover:underline">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            Change image
          </label>
        </div>
        <canvas
          ref={canvasRef}
          className="max-w-full rounded-xl cursor-crosshair border border-[var(--border)]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredColor(null)}
          onClick={handleClick}
        />
      </div>

      {/* Floating color tooltip that follows the cursor */}
      {hoveredColor && hasImage && (
        <div
          className="fixed pointer-events-none z-50 px-2 py-1 rounded text-xs font-mono shadow-md border border-[var(--border)]"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y + 14,
            background: hoveredColor,
            color: chroma.contrast(hoveredColor, "white") > 4.5 ? "white" : "black",
          }}
        >
          {hoveredColor}
        </div>
      )}
    </div>
  );
}
