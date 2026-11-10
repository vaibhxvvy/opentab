import { Badge } from "../../ui/badge";

interface Pattern {
  enemy: string;
  how: string;
  replaced: { id: string; name: string }[];
}

const PATTERNS: Pattern[] = [
  {
    enemy: "PDF tools that count your files",
    how: "Merge two files free, then a monthly plan appears. The third merge is a subscription.",
    replaced: [
      { id: "pdf-joiner", name: "PDF joiner" },
      { id: "image-to-pdf", name: "Image → PDF" },
    ],
  },
  {
    enemy: "Converters that throttle you",
    how: "One image a day free, then a queue, a timer and a 'premium' tier to skip both.",
    replaced: [
      { id: "image-converter", name: "Image converter" },
      { id: "image-crusher", name: "Image crusher" },
      { id: "image-resizer", name: "Image resizer" },
    ],
  },
  {
    enemy: "QR codes with a subscription",
    how: "Free until you need a PNG, a vector, a color, or your sixth code this month.",
    replaced: [{ id: "qr-forge", name: "QR forge" }],
  },
  {
    enemy: "Extractors behind an email wall",
    how: "Upload your photo and 'we'll email you the colors.' The email address is the real product.",
    replaced: [
      { id: "palette-snatcher", name: "Palette snatcher" },
      { id: "exif-stripper", name: "EXIF stripper" },
    ],
  },
  {
    enemy: "Checkers that hold the answer hostage",
    how: "A regex or color tool that shows the result behind 'create a free account to continue'.",
    replaced: [
      { id: "regex-lab", name: "Regex lab" },
      { id: "color-lab", name: "Color lab" },
      { id: "password-tester", name: "Password tester" },
    ],
  },
  {
    enemy: "Formatters with watermarks",
    how: "Your JSON, markdown and ASCII art, branded with their logo until you pay to remove it.",
    replaced: [
      { id: "json-formatter", name: "JSON formatter" },
      { id: "markdown-forge", name: "Markdown forge" },
      { id: "ascii-artist", name: "ASCII artist" },
    ],
  },
  {
    enemy: "Encoders with monthly caps",
    how: "Ten base64 encodings a month free. Ten. For a string operation that takes 2ms.",
    replaced: [
      { id: "base64", name: "Base64 machine" },
      { id: "hasher", name: "Hasher" },
      { id: "data-uri", name: "Data URI generator" },
    ],
  },
  {
    enemy: "Format swaps as a paid feature",
    how: "CSV, YAML, JSON — the same data, four markup shapes, and they charge per shape.",
    replaced: [
      { id: "csv-json", name: "CSV ⇄ JSON" },
      { id: "yaml-json", name: "YAML ⇄ JSON" },
      { id: "json-to-ts", name: "JSON → TypeScript" },
    ],
  },
];

export function PaywallPatterns() {
  return (
    <section
      id="paywall-patterns"
      aria-labelledby="paywall-patterns-title"
      className="border-b-4 border-ink bg-ink text-paper"
    >
      <div className="page-container py-14 sm:py-20">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper/60">
          [ THE ENEMY ] — ONE PATTERN, EIGHT SHAPES
        </p>
        <h2
          id="paywall-patterns-title"
          className="mt-2 font-display text-[clamp(2rem,6vw,4.5rem)] font-bold uppercase leading-[0.95] tracking-tight"
        >
          Free once.
          <br />
          <span className="inline-block bg-red px-3 text-ink shadow-brutal-sm">
            Then a wall.
          </span>
        </h2>
        <p className="mt-4 max-w-xl text-base font-medium text-paper/70">
          You know this pattern: a tool is free exactly until it becomes useful.
          The first use is the demo; the second is the paywall. We rebuilt those
          tasks — every one of them runs in your browser, forever free.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PATTERNS.map((p) => (
            <li
              key={p.enemy}
              className="flex flex-col rounded-lg border-[3px] border-paper bg-surface p-5 text-ink shadow-brutal-md transition-[transform,box-shadow] duration-200 ease-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="red">PAY WALL</Badge>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  THE PATTERN
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold leading-tight text-ink">
                {p.enemy}
              </h3>
              <p className="mt-2 flex-1 font-mono text-[11px] leading-relaxed text-ink/60">
                {p.how}
              </p>
              <p className="mt-4 border-t-2 border-dashed border-ink/30 pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-green">
                replaced by
              </p>
              <ul className="mt-2 space-y-1.5">
                {p.replaced.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#/tools/${t.id}`}
                      className="group inline-flex w-full items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[11px] font-bold text-ink transition-[background-color,color] duration-200 ease-brutal hover:bg-yellow"
                    >
                      {t.name}
                      <span className="text-ink/40 transition-transform duration-200 ease-brutal group-hover:translate-x-0.5">
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-widest text-paper/60">
          Spot a paywall we haven't killed?{" "}
          <a
            href="https://github.com/vaibhxvvy/opentab/issues/new?template=request-to-add-a-tool.md"
            className="bg-yellow px-1 text-ink no-underline"
          >
            report it
          </a>
        </p>
      </div>
    </section>
  );
}