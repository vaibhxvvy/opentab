import { useState } from "react";
import type { ChangeEvent } from "react";
import { CreditCard, FileDown } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface CardData {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

const ACCENTS = [
  { id: "yellow", name: "Yellow", bg: "#F5F0E8", accent: "#FFD84D", ink: "#111111" },
  { id: "ink", name: "Ink", bg: "#111111", accent: "#FFD84D", ink: "#F5F0E8" },
  { id: "paper", name: "Paper", bg: "#F5F0E8", accent: "#111111", ink: "#111111" },
  { id: "blue", name: "Blue", bg: "#4D8DFF", accent: "#FFD84D", ink: "#111111" },
  { id: "red", name: "Red", bg: "#FF5A5F", accent: "#111111", ink: "#F5F0E8" },
];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

const EMPTY: CardData = {
  name: "Rhea Sharma",
  role: "Lead Designer",
  company: "OpenTab Co.",
  email: "rhea@opentab.com",
  phone: "+91 98765 43210",
  website: "opentab.com",
  address: "Bengaluru, IN",
};

export function BusinessCard() {
  const [data, setData] = useState<CardData>(EMPTY);
  const [accent, setAccent] = useState(ACCENTS[0]);

  const set = (k: keyof CardData) => (e: ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const cardSvg = (): string => {
    const w = 900;
    const h = 500;
    const c = accent;
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const lines = [
      { label: "EMAIL", value: data.email },
      { label: "PHONE", value: data.phone },
      { label: "WEB", value: data.website },
      { label: "BASE", value: data.address },
    ].filter((l) => l.value.trim() !== "");
    const startY = 465 - (lines.length - 1) * 38;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%;height:100%">
  <rect width="${w}" height="${h}" fill="${c.bg}"/>
  <rect x="0" y="0" width="26" height="${h}" fill="${c.accent}"/>
  <text x="78" y="86" font-family="Space Grotesk, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="4" fill="${c.ink}" opacity="0.75">${esc(data.company || "COMPANY")}</text>
  <text x="78" y="232" font-family="Space Grotesk, Arial, sans-serif" font-size="72" font-weight="700" fill="${c.ink}">${esc(data.name || "NAME")}</text>
  <text x="80" y="282" font-family="Space Grotesk, Arial, sans-serif" font-size="28" font-weight="500" letter-spacing="3" fill="${c.ink}" opacity="0.6">${esc(data.role || "ROLE")}</text>
  <line x1="78" y1="312" x2="${w - 90}" y2="312" stroke="${c.ink}" stroke-width="3" opacity="0.3"/>
  ${lines
    .map(
      (l, i) =>
        `<text x="78" y="${startY + i * 38}" font-family="Space Grotesk, Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="2" fill="${c.ink}" opacity="0.45">${l.label}</text>
         <text x="200" y="${startY + i * 38}" font-family="Space Grotesk, Arial, sans-serif" font-size="19" font-weight="500" fill="${c.ink}">${esc(l.value)}</text>`,
    )
    .join("\n  ")}
</svg>`;
  };

  const downloadPng = async () => {
    const svg = cardSvg();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 4;
      canvas.width = 900 * scale;
      canvas.height = 500 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${data.company || "card"}-${data.name.replace(/[^A-Za-z0-9]+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <ToolShell
      crumb="BUSINESS-CARD"
      title="The calling card."
      tagline="A 90×50 mm brutalist business card, live-rendered and exported at print resolution. The card-printing sites charge per card and watermark the preview; this is the finished product."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Details
            <CreditCard className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Name</span>
              <input className={inputCls} value={data.name} onChange={set("name")} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Role</span>
              <input className={inputCls} value={data.role} onChange={set("role")} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Company</span>
              <input className={inputCls} value={data.company} onChange={set("company")} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Email</span>
              <input className={inputCls} value={data.email} onChange={set("email")} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Phone</span>
              <input className={inputCls} value={data.phone} onChange={set("phone")} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Website</span>
              <input className={inputCls} value={data.website} onChange={set("website")} />
            </label>
            <label className="col-span-2 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Address / City</span>
              <input className={inputCls} value={data.address} onChange={set("address")} />
            </label>
          </div>

          <div className="mt-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Accent</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a)}
                  title={a.name}
                  className={`h-9 w-9 rounded-md border-2 border-ink transition-transform duration-150 ease-brutal hover:-translate-y-0.5 ${
                    a.id === accent.id ? "ring-2 ring-yellow ring-offset-2 ring-offset-surface" : ""
                  }`}
                  style={{ background: a.bg }}
                  aria-label={`${a.name} accent`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Card</h2>
            <span className="ml-auto rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
              90 × 50 mm
            </span>
          </div>

          <div className="mt-4 flex flex-1 items-center justify-center overflow-auto rounded-md border-2 border-ink bg-surface-muted p-6">
            <div
              className="w-full max-w-[560px] shadow-brutal-md"
              style={{ aspectRatio: "900 / 500" }}
              dangerouslySetInnerHTML={{ __html: cardSvg() }}
            />
          </div>

          <Button onClick={downloadPng} className="mt-4 w-full uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download PNG · 3600 × 2000
          </Button>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Print resolution at 300 dpi — the exact file print shops accept.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered locally as SVG — the card designer that never upsells you a box of 500.
      </p>
    </ToolShell>
  );
}