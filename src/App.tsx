import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import chroma from "chroma-js";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import ImagePicker from "./components/ImagePicker";
import RorschachGenerator from "./components/RorschachGenerator";
import type { SchemeType } from "./utils/generatePalette";
import { generatePalette } from "./utils/generatePalette";

// ── Types ─────────────────────────────────────────────────────────────────

type SavedPalette = {
  id: string;
  baseColor: string;
  scheme: SchemeType;
  colors: string[];
  savedAt: number;
};

// ── ColorPickerPopover ────────────────────────────────────────────────────

function ColorPickerPopover({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover:scale-110 transition-transform flex-shrink-0"
        style={{
          background: color,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid var(--border)",
          cursor: "pointer",
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
        title="Open color picker"
      />
      {open && (
        <div className="absolute top-10 left-0 z-30 shadow-xl rounded-xl overflow-hidden border border-[var(--border)]">
          <HexColorPicker color={color} onChange={onChange} />
          <div className="px-3 py-2 bg-[var(--bg)] border-t border-[var(--border)]">
            <input
              type="text"
              value={color}
              onChange={(e) => {
                try {
                  onChange(chroma(e.target.value).hex());
                } catch {}
              }}
              className="w-full text-center font-mono text-sm bg-[var(--code-bg)] text-[var(--text-h)] rounded px-2 py-1 outline-none border border-[var(--border)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── SortableSwatch ────────────────────────────────────────────────────────

function SortableSwatch({
  id,
  color,
  onHexChange,
}: {
  id: string;
  color: string;
  onHexChange: (id: string, hex: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(color);
  const inputRef = useRef<HTMLInputElement>(null);

  const fg = chroma.contrast(color, "white") > 4.5 ? "white" : "black";
  const contrastW = chroma.contrast(color, "white");
  const contrastB = chroma.contrast(color, "black");
  const best = Math.max(contrastW, contrastB);
  const wcag = best >= 7 ? "AAA" : best >= 4.5 ? "AA" : "—";
  const badgeCls =
    wcag === "AAA"
      ? "bg-emerald-600"
      : wcag === "AA"
      ? "bg-blue-600"
      : "bg-neutral-500";

  useEffect(() => {
    if (!editing) setDraft(color);
  }, [color, editing]);

  function handleCopy() {
    if (editing) return;
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    setDraft(color);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commitEdit() {
    setEditing(false);
    try {
      onHexChange(id, chroma(draft).hex());
    } catch {
      setDraft(color);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: color,
      }}
      className={`group relative flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 select-none
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${editing ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
      {...attributes}
      {...(editing ? {} : listeners)}
      onClick={handleCopy}
    >
      {/* WCAG badge */}
      <div
        className={`absolute top-1.5 left-1.5 text-[9px] font-mono text-white px-1 py-0.5 rounded ${badgeCls}`}
        title={`Contrast ratio ${best.toFixed(2)}:1`}
      >
        {wcag} {best.toFixed(1)}
      </div>

      {/* Hex display / edit input */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(color);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-20 text-center text-xs font-mono rounded px-1 py-0.5 outline-none border border-white/40 bg-black/20"
          style={{ color: fg }}
        />
      ) : (
        <span style={{ color: fg }} className="text-xs font-mono">
          {copied ? "Copied!" : color}
        </span>
      )}

      {/* Edit button — appears on hover */}
      {!editing && (
        <button
          className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-80 transition-opacity text-[9px] px-1 py-0.5 rounded"
          style={{
            color: fg,
            background:
              fg === "white" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={startEdit}
          title="Edit hex value"
        >
          edit
        </button>
      )}
    </div>
  );
}

// ── DragSwatch ────────────────────────────────────────────────────────────

function DragSwatch({ color }: { color: string }) {
  return (
    <div
      style={{
        background: color,
        color: chroma.contrast(color, "white") > 4.5 ? "white" : "black",
        animation: "wobble 0.6s ease forwards",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
      className="w-36 h-36 flex items-center justify-center cursor-grabbing text-xs font-mono select-none rounded"
    >
      {color}
    </div>
  );
}

// ── ExportModal ───────────────────────────────────────────────────────────

function ExportModal({
  colors,
  onClose,
}: {
  colors: string[];
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"css" | "hex" | "json">("css");
  const [copied, setCopied] = useState(false);

  const content = {
    css: `:root {\n${colors
      .map((c, i) => `  --color-${i + 1}: ${c};`)
      .join("\n")}\n}`,
    hex: colors.join(", "),
    json: JSON.stringify(colors, null, 2),
  }[format];

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--text-h)] font-semibold text-lg">
            Export Palette
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text)] hover:text-[var(--text-h)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          {(["css", "hex", "json"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded-lg text-sm font-mono transition-colors
                ${
                  format === f
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--code-bg)] text-[var(--text-h)] hover:opacity-80"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        <pre className="bg-[var(--code-bg)] text-[var(--text-h)] text-xs font-mono rounded-xl p-4 overflow-auto max-h-48 whitespace-pre">
          {content}
        </pre>
        <button
          onClick={copy}
          className="mt-4 w-full bg-[var(--accent)] hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-medium transition-opacity"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [baseColor, setBaseColor] = useState("#3b82f6");
  const [scheme, setScheme] = useState<SchemeType>("analogous");
  const [count, setCount] = useState(5);
  const [sorted, setSorted] = useState(false);
  const [customOrderState, setCustomOrderState] = useState<{
    key: string;
    order: string[];
    ids: string[];
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [rorschachUrl, setRorschachUrl] = useState<string | null>(null);
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pal-ette-saved") ?? "[]");
    } catch {
      return [];
    }
  });

  const generated = generatePalette(baseColor, scheme, count, sorted);
  const generatedKey = generated.join(",");
  const isCustomValid =
    customOrderState !== null && customOrderState.key === generatedKey;
  const palette = isCustomValid ? customOrderState.order : generated;
  const stableIds = isCustomValid
    ? customOrderState.ids
    : generated.map((_, i) => String(i));
  const activeColor =
    activeId !== null ? palette[stableIds.indexOf(activeId)] : null;

  // Require 8px movement before a drag starts, so clicks register cleanly
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = stableIds.indexOf(active.id as string);
    const newIndex = stableIds.indexOf(over.id as string);
    setCustomOrderState({
      key: generatedKey,
      order: arrayMove(palette, oldIndex, newIndex),
      ids: arrayMove(stableIds, oldIndex, newIndex),
    });
  }

  function handleHexChange(id: string, hex: string) {
    const idx = stableIds.indexOf(id);
    if (idx === -1) return;
    setCustomOrderState({
      key: generatedKey,
      order: palette.map((c, i) => (i === idx ? hex : c)),
      ids: stableIds.slice(),
    });
  }

  function savePalette() {
    const entry: SavedPalette = {
      id: crypto.randomUUID(),
      baseColor,
      scheme,
      colors: [...palette],
      savedAt: Date.now(),
    };
    const updated = [entry, ...savedPalettes].slice(0, 20);
    setSavedPalettes(updated);
    localStorage.setItem("pal-ette-saved", JSON.stringify(updated));
  }

  function deleteSaved(id: string) {
    const updated = savedPalettes.filter((p) => p.id !== id);
    setSavedPalettes(updated);
    localStorage.setItem("pal-ette-saved", JSON.stringify(updated));
  }

  function loadSaved(p: SavedPalette) {
    setBaseColor(p.baseColor);
    setScheme(p.scheme);
    setCount(p.colors.length);
    setSorted(false);
    setCustomOrderState(null);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="px-8 sm:px-10 py-8">
        <h1
          className="text-4xl sm:text-8xl font-bold mb-8 tracking-tight"
          style={rorschachUrl ? {
            backgroundImage: `url(${rorschachUrl})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundAttachment: "fixed",
          } : { color: "var(--text-h)" }}
        >
          Pal-ette
        </h1>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <select
            value={scheme}
            onChange={(e) => {
              setScheme(e.target.value as SchemeType);
              setSorted(false);
            }}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] text-sm cursor-pointer"
          >
            <option value="analogous">Analogous</option>
            <option value="complementary">Complementary</option>
            <option value="triadic">Triadic</option>
            <option value="tetradic">Tetradic</option>
          </select>

          <ColorPickerPopover color={baseColor} onChange={setBaseColor} />

          <div className="flex items-center gap-1.5">
            <label className="text-sm text-[var(--text)]">Colors: </label>
            <input
              type="number"
              min={1}
              max={12}
              value={count}
              onChange={(e) =>
                setCount(Math.min(12, Math.max(1, Number(e.target.value))))
              }
              className="w-12 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] text-sm text-center"
            />
          </div>

          <button
            onClick={() => setCount((c) => Math.min(12, c + 1))}
            disabled={count >= 12}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-h)] hover:bg-[var(--code-bg)] disabled:opacity-40 transition-colors"
          >
            + Add
          </button>

          <button
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            disabled={count <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-h)] hover:bg-[var(--code-bg)] disabled:opacity-40 transition-colors"
          >
            − Remove
          </button>

          <button
            onClick={() => setSorted((s) => !s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors
              ${
                sorted
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
              }`}
          >
            {sorted ? "Unsort" : "Sort"}
          </button>

          {isCustomValid && (
            <button
              onClick={() => setCustomOrderState(null)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-h)] hover:bg-[var(--code-bg)] transition-colors"
            >
              Reset Order
            </button>
          )}
        </div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 font-medium transition-opacity"
          >
            Export
          </button>
          <button
            onClick={savePalette}
            className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-h)] hover:bg-[var(--code-bg)] transition-colors"
          >
            Save Palette
          </button>
        </div>

        {/* ── Swatch grid ───────────────────────────────────────────────── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stableIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-1.5 mb-2">
              {palette.map((color, i) => (
                <SortableSwatch
                  key={stableIds[i]}
                  id={stableIds[i]}
                  color={color}
                  onHexChange={handleHexChange}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeColor ? <DragSwatch color={activeColor} /> : null}
          </DragOverlay>
        </DndContext>

        <p className="text-[11px] text-[var(--text)] opacity-50 mb-8">
          Click a swatch to copy · Hover and click "edit" to change its hex ·
          Drag to reorder
        </p>

        {/* ── Rorschach generator ──────────────────────────────────────── */}
        <RorschachGenerator colors={palette} onGenerate={setRorschachUrl} />

        {/* ── Image color picker ────────────────────────────────────────── */}
        <ImagePicker onColorPick={setBaseColor} />

        {/* ── Saved palettes ────────────────────────────────────────────── */}
        {savedPalettes.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-[var(--text-h)] mb-3">
              Saved Palettes
            </h2>
            <div className="flex flex-col gap-2">
              {savedPalettes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--code-bg)] transition-colors group cursor-pointer"
                  onClick={() => loadSaved(p)}
                >
                  <div className="flex rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                    {p.colors.map((c, i) => (
                      <div
                        key={i}
                        style={{ background: c }}
                        className="w-6 h-8"
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono capitalize text-[var(--text)]">
                      {p.scheme}
                    </span>
                    <span className="text-[11px] text-[var(--text)] opacity-50 ml-2">
                      {new Date(p.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text)] hover:text-red-500 text-xl leading-none px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSaved(p.id);
                    }}
                    title="Delete saved palette"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showExport && (
        <ExportModal colors={palette} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
