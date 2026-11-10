import { useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
import qrcode from "qrcode-generator";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const SIZES = [128, 256, 512] as const;
const LEVELS = ["L", "M", "Q", "H"] as const;

export function QrForge() {
  const [text, setText] = useState("https://github.com/vaibhxvvy/opentab");
  const [size, setSize] = useState<number>(256);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("M");

  const qr = useMemo(() => {
    try {
      const q = qrcode(0, level);
      q.addData(text || " ");
      q.make();
      return q;
    } catch {
      return null;
    }
  }, [text, level]);

  const svgString = useMemo(() => qr?.createSvgTag({ cellSize: 1, margin: 1 }) ?? null, [qr]);
  const pngDataUrl = useMemo(
    () => qr?.createDataURL(Math.round(size / qr.getModuleCount()) || 1, 2) ?? null,
    [qr, size],
  );
  const previewUrl = useMemo(
    () =>
      svgString
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
        : null,
    [svgString],
  );

  const download = (kind: "svg" | "png") => {
    const a = document.createElement("a");
    a.download = `fcuk-qr.${kind}`;
    if (kind === "svg" && svgString) {
      a.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    } else if (pngDataUrl) {
      a.href = pngDataUrl;
    }
    a.click();
  };

  return (
    <ToolShell
      crumb="QR-FORGE"
      title="The QR forge."
      tagline="Turn any text or URL into a scannable square. SVG or PNG, any size, error correction included."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Content
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={4}
            placeholder="Text or URL to encode…"
            className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Size
            </p>
            <div className="mt-2 flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                    size === s ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Error correction
            </p>
            <div className="mt-2 flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  title={
                    l === "L" ? "7% recoverable" : l === "M" ? "15%" : l === "Q" ? "25%" : "30%"
                  }
                  className={cn(
                    "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                    level === l ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Higher correction = denser QR, survives stickers and scratches.
            </p>
          </div>
        </section>

        <section className="flex flex-col items-center rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="self-start font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] The forge
          </h2>
          <div className="mt-4 flex min-h-[280px] w-full items-center justify-center rounded-md border-2 border-ink bg-paper p-6">
            {qr && previewUrl ? (
              <img
                src={previewUrl}
                alt="Generated QR code"
                className="h-auto w-full max-w-[260px] select-none [image-rendering:pixelated]"
              />
            ) : (
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
                Nothing to scan yet
              </p>
            )}
          </div>
          <div className="mt-4 flex w-full flex-wrap gap-2">
            <Button
              size="sm"
              className="flex-1 uppercase"
              onClick={() => download("png")}
              disabled={!pngDataUrl}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              PNG {size}px
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 uppercase"
              onClick={() => download("svg")}
              disabled={!svgString}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              SVG
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            {qr
              ? `[ OK ] ${qr.getModuleCount()}×${qr.getModuleCount()} MODULES // LEVEL ${level}`
              : "[ ERR ] TEXT TOO LONG FOR THIS LEVEL"}
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Generated locally — the QR never leaves your tab.
      </p>
    </ToolShell>
  );
}