import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Scissors, Download, Eraser, Paintbrush, Undo2, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface ImgState {
  url: string;
  el: HTMLImageElement;
  w: number;
  h: number;
}

type BrushMode = "erase" | "restore";

interface Stroke {
  mode: BrushMode;
  size: number;
  points: [number, number][];
}

function sampleBg(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const counts = new Map<number, number>();
  const walk = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const q = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    counts.set(q, (counts.get(q) ?? 0) + 1);
  };
  for (let x = 0; x < w; x++) {
    walk(x, 0);
    walk(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    walk(0, y);
    walk(w - 1, y);
  }
  let best = 0, bestCount = -1;
  for (const [q, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      best = q;
    }
  }
  return [(best >> 8) & 0xf0, (best >> 4) & 0xf0, best & 0xf0];
}

function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function removeBackground(
  canvas: HTMLCanvasElement,
  tolerance: number,
  manual: [number, number, number] | null,
): void {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const bg = manual ?? sampleBg(data, w, h);

  const visited = new Uint8Array(w * h);
  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);
  let head = 0, tail = 0;

  const push = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queueX[tail] = x;
    queueY[tail] = y;
    tail++;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  const tol2 = tolerance * tolerance * 3;
  while (head < tail) {
    const x = queueX[head];
    const y = queueY[head];
    head++;
    const i = (y * w + x) * 4;
    const d = distance(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2]);
    if (d * d > tol2) continue;
    data[i + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  const feather = Math.max(1, Math.round(tolerance / 12));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] !== 0) continue;
      for (let fy = 1; fy <= feather; fy++) {
        if (y - fy < 0) break;
        const j = ((y - fy) * w + x) * 4;
        if (data[j + 3] !== 0) {
          const a = 255 * (1 - fy / (feather + 1));
          if (a > data[j + 3] * 0.5) data[j + 3] = Math.max(data[j + 3], a);
          break;
        }
      }
      for (let fx = 1; fx <= feather; fx++) {
        if (x - fx < 0) break;
        const j = (y * w + (x - fx)) * 4;
        if (data[j + 3] !== 0) {
          const a = 255 * (1 - fx / (feather + 1));
          if (a > data[j + 3] * 0.5) data[j + 3] = Math.max(data[j + 3], a);
          break;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function freshLayer(current: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
  const layer = current ?? document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  return layer;
}

function reusableLayer(current: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
  const layer = current ?? document.createElement("canvas");
  if (layer.width !== w) layer.width = w;
  if (layer.height !== h) layer.height = h;
  return layer;
}

function stamp(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
): void {
  const half = size / 2;
  ctx.lineWidth = size;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 20;
  if (x0 === x1 && y0 === y1) {
    ctx.beginPath();
    ctx.rect(x1 - half, y1 - half, size, size);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function paintSegment(
  ctx: CanvasRenderingContext2D,
  mode: BrushMode,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  base: HTMLCanvasElement,
  scratch: HTMLCanvasElement,
): void {
  if (mode === "erase") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    stamp(ctx, x0, y0, x1, y1, size);
    ctx.restore();
    return;
  }
  const sctx = scratch.getContext("2d")!;
  sctx.globalCompositeOperation = "source-over";
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  sctx.drawImage(base, 0, 0);
  sctx.globalCompositeOperation = "destination-in";
  sctx.strokeStyle = "#fff";
  sctx.fillStyle = "#fff";
  stamp(sctx, x0, y0, x1, y1, size);
  sctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(scratch, 0, 0);
}

function replayStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  base: HTMLCanvasElement,
  scratch: HTMLCanvasElement,
): void {
  for (let i = 0; i < stroke.points.length; i++) {
    const [x, y] = stroke.points[i];
    const [px, py] = stroke.points[i - 1] ?? stroke.points[0];
    paintSegment(ctx, stroke.mode, px, py, x, y, stroke.size, base, scratch);
  }
}

export function BackgroundRemover() {
  const [img, setImg] = useState<ImgState | null>(null);
  const [tolerance, setTolerance] = useState(40);
  const [manual, setManual] = useState<[number, number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [brushMode, setBrushMode] = useState<BrushMode>("erase");
  const [brushSize, setBrushSize] = useState(20);
  const [zoom, setZoom] = useState<"fit" | "actual">("fit");
  const [strokeCount, setStrokeCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const cutRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const pointRef = useRef({ x: 0, y: 0 });

  // Manual strokes are kept as an operation log, not baked pixels, so undo and
  // reprocess can rebuild the canvas from the auto-cut without a PNG round trip.
  const repaint = () => {
    const canvas = canvasRef.current;
    const cut = cutRef.current;
    const base = baseRef.current;
    if (!canvas || !cut) return;
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cut, 0, 0);
    if (!base) return;
    scratchRef.current = reusableLayer(scratchRef.current, canvas.width, canvas.height);
    for (const s of strokesRef.current) {
      replayStroke(ctx, s, base, scratchRef.current);
    }
  };

  const rerunCut = (tol: number, man: [number, number, number] | null) => {
    const base = baseRef.current;
    const cut = cutRef.current;
    if (!base || !cut) return;
    const ctx = cut.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, cut.width, cut.height);
    ctx.drawImage(base, 0, 0);
    removeBackground(cut, tol, man);
  };

  const prepareLayers = () => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return false;
    const { el, w, h } = img;

    const base = freshLayer(baseRef.current, w, h);
    baseRef.current = base;
    const bctx = base.getContext("2d")!;
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = "high";
    bctx.drawImage(el, 0, 0, w, h);

    cutRef.current = freshLayer(cutRef.current, w, h);
    canvas.width = w;
    canvas.height = h;

    strokesRef.current = [];
    setStrokeCount(0);
    return true;
  };

  const pick = (file: File) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const maxDim = 1600;
      const ratio = Math.min(1, maxDim / Math.max(el.naturalWidth, el.naturalHeight));
      setImg({ url, el, w: Math.round(el.naturalWidth * ratio), h: Math.round(el.naturalHeight * ratio) });
      setManual(null);
    };
    el.src = url;
  };

  useEffect(() => {
    if (!img) return;
    if (!prepareLayers()) return;
    rerunCut(tolerance, manual);
    repaint();
  }, [img]);

  const reprocess = (tol = tolerance, man = manual) => {
    if (!img || busy) return;
    setBusy(true);
    requestAnimationFrame(() => {
      rerunCut(tol, man);
      repaint();
      setBusy(false);
    });
  };

  const applyPreset = (color: [number, number, number] | null) => {
    setManual(color);
    reprocess(tolerance, color);
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    repaint();
  };

  const clearStrokes = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    repaint();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key.toLowerCase() !== "z" || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable) return;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (strokesRef.current.length === 0) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  const appendPoint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    const current = strokesRef.current[strokesRef.current.length - 1];
    if (!canvas || !base || !current) return;
    scratchRef.current = reusableLayer(scratchRef.current, canvas.width, canvas.height);
    paintSegment(
      canvas.getContext("2d")!,
      current.mode,
      pointRef.current.x,
      pointRef.current.y,
      x,
      y,
      current.size,
      base,
      scratchRef.current,
    );
    current.points.push([x, y]);
    pointRef.current = { x, y };
  };

  const toPixel = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const moveRing = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ring = ringRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!ring || !canvas || !stage) return;
    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const diameter = Math.max(2, brushSize * (canvasRect.width / canvas.width));
    ring.style.width = `${diameter}px`;
    ring.style.height = `${diameter}px`;
    ring.style.display = "block";
    ring.style.transform = `translate(${e.clientX - stageRect.left + stage.scrollLeft - diameter / 2}px, ${
      e.clientY - stageRect.top + stage.scrollTop - diameter / 2
    }px)`;
  };

  const hideRing = () => {
    const ring = ringRef.current;
    if (ring) ring.style.display = "none";
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPixel(e);
    strokesRef.current.push({ mode: brushMode, size: brushSize, points: [] });
    setStrokeCount(strokesRef.current.length);
    pointRef.current = p;
    drawingRef.current = true;
    appendPoint(p.x, p.y);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    moveRing(e);
    if (!drawingRef.current) return;
    const p = toPixel(e);
    appendPoint(p.x, p.y);
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "fcuk-nobg.png";
    a.click();
  };

  return (
    <ToolShell
      crumb="BACKGROUND-REMOVER"
      title="The cutter."
      tagline="Strip solid backgrounds to transparent, then scrub the stragglers by hand — unlimited cuts, no credit packs."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Scissors className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-4 w-full rounded-lg border-[3px] border-ink px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal",
              img ? "bg-surface-muted hover:bg-yellow/30" : "border-dashed",
            )}
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {img ? "Pick another image" : "Drop or pick an image"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Best on solid or plain backgrounds · stays in your tab
            </p>
          </button>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Tolerance — {tolerance}
              </span>
              <input
                type="range"
                min={5}
                max={120}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(null)}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual === null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Auto (edge color)
              </button>
              <button
                type="button"
                onClick={() => applyPreset([255, 255, 255])}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual !== null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => applyPreset([0, 0, 0])}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual !== null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Black
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => reprocess()}
                disabled={!img || busy}
                className="ml-auto uppercase"
              >
                Reprocess
              </Button>
            </div>
            <p className="rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              Flood-fill removal: perfect for product shots and scans on plain
              backgrounds. Reprocess re-cuts from the original and keeps your brush
              work — hair, fur and busy scenes still need an AI, that's the remove.bg
              credit system we refuse to clone.
            </p>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Result</h2>
          {img ? (
            <>
              <div
                ref={stageRef}
                className={cn(
                  "relative mt-4 overflow-auto rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px]",
                  zoom === "fit" ? "grid max-h-[30rem] place-items-center p-4" : "max-h-[30rem]",
                )}
              >
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Cutout preview — drag to erase or restore pixels the flood fill missed"
                  style={{ cursor: "none" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerEnter={moveRing}
                  onPointerLeave={hideRing}
                  className={cn(
                    "block touch-none border-2 border-ink",
                    zoom === "fit" ? "max-h-[26rem] w-auto object-contain" : "mx-auto my-4 shrink-0",
                  )}
                />
                <div
                  ref={ringRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-0 hidden border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.65)]"
                />
              </div>

              <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  [03] Brush — the pixels the flood fill missed
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBrushMode("erase")}
                    aria-pressed={brushMode === "erase"}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                      brushMode === "erase"
                        ? "bg-ink text-surface shadow-brutal-sm"
                        : "bg-surface hover:bg-yellow/30",
                    )}
                  >
                    <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                    Erase
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrushMode("restore")}
                    aria-pressed={brushMode === "restore"}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                      brushMode === "restore"
                        ? "bg-ink text-surface shadow-brutal-sm"
                        : "bg-surface hover:bg-yellow/30",
                    )}
                  >
                    <Paintbrush className="h-3.5 w-3.5" aria-hidden="true" />
                    Restore
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearStrokes}
                    disabled={strokeCount === 0}
                    className="ml-auto uppercase"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Clear
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={undo}
                    disabled={strokeCount === 0}
                    title="Undo last stroke (Ctrl+Z / ⌘Z)"
                    className="uppercase"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    Undo{strokeCount > 0 ? ` ${strokeCount}` : ""}
                  </Button>
                </div>
                <label className="mt-3 block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Brush size — {brushSize}px
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={100}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="mt-2 w-full accent-yellow"
                  />
                </label>
                <p className="mt-2 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
                  {brushMode === "erase"
                    ? "Drag across the leftover background to punch it out. Square brush, ring = exact size. Ctrl+Z / ⌘Z undoes one stroke."
                    : "Drag to paste the original pixels back where you cut too deep. Ctrl+Z / ⌘Z undoes one stroke."}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {img.w} × {img.h}px · transparent PNG
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => (z === "fit" ? "actual" : "fit"))}
                    className="uppercase"
                  >
                    {zoom === "fit" ? (
                      <ZoomIn className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ZoomOut className="h-4 w-4" aria-hidden="true" />
                    )}
                    {zoom === "fit" ? "1:1" : "Fit"}
                  </Button>
                  <Button onClick={download} size="sm" className="uppercase">
                    <Download className="h-4 w-4" aria-hidden="true" /> PNG
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Cutout appears here
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Unlimited previews and downloads — your image never hits a server or a credit meter.
      </p>
    </ToolShell>
  );
}
