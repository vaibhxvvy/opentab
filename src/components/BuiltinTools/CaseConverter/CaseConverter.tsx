import { useMemo, useState } from "react";
import { CaseSensitive } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

function splitWords(s: string): string[] {
  return (
    s
      .match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|\d+|[^\sA-Za-z0-9]+/g)
      ?.map((w) => w.toLowerCase()) ?? []
  );
}

function camel(s: string) {
  const w = splitWords(s);
  return w.map((x, i) => (i === 0 ? x : x.charAt(0).toUpperCase() + x.slice(1))).join("");
}
function pascal(s: string) {
  return splitWords(s).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join("");
}
function snake(s: string) {
  return splitWords(s).join("_");
}
function screaming(s: string) {
  return splitWords(s).join("_").toUpperCase();
}
function kebab(s: string) {
  return splitWords(s).join("-");
}
function title(s: string) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}
function alternating(s: string) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    out += i % 2 === 0 ? s[i].toLowerCase() : s[i].toUpperCase();
  }
  return out;
}
function leet(s: string) {
  return s
    .toLowerCase()
    .replace(/a/g, "4")
    .replace(/e/g, "3")
    .replace(/g/g, "6")
    .replace(/i/g, "1")
    .replace(/o/g, "0")
    .replace(/s/g, "5")
    .replace(/t/g, "7")
    .replace(/fcuk/g, "FCUK");
}
function spongebob(s: string) {
  return s
    .split("")
    .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
    .join("");
}

const TRANSFORMS: Record<string, (s: string) => string> = {
  camelCase: camel,
  PascalCase: pascal,
  snake_case: snake,
  SCREAMING_SNAKE: screaming,
  "kebab-case": kebab,
  "Title Case": title,
  lowercase: (s) => s.toLowerCase(),
  UPPERCASE: (s) => s.toUpperCase(),
  aLtErNaTiNg: alternating,
  "sPoNgEbOb": spongebob,
  "l33t fcuk mode": leet,
};

export function CaseConverter() {
  const [input, setInput] = useState("opentab, no signup required");
  const [copied, setCopied] = useState<string | null>(null);

  const results = useMemo(() => {
    return Object.entries(TRANSFORMS).map(([name, fn]) => ({ name, value: fn(input) }));
  }, [input]);

  const copy = async (name: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <ToolShell
      crumb="CASE-CONVERTER"
      title="The case officer."
      tagline="camelCase, snake_case, kebab-case, l33t — every case your codebase demands, live in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Input
            <CaseSensitive className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={6}
            placeholder="Type something…"
            className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            Words are split on spaces, dashes, underscores and case boundaries
          </p>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] All the cases
          </h2>
          <ul className="mt-4 space-y-2">
            {results.map((r) => (
              <li key={r.name} className="flex items-center gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    {r.name}
                  </p>
                  <p className="break-all font-mono text-xs font-bold text-ink">{r.value}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(r.name, r.value)}
                  className={cn(
                    "shrink-0 rounded-md border-2 border-ink px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                    copied === r.name ? "bg-green text-ink" : "hover:bg-yellow/60",
                  )}
                >
                  {copied === r.name ? "Done" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Every conversion runs locally — n0 53rv3r, n0 w4ll5.
      </p>
    </ToolShell>
  );
}