import { useMemo, useState } from "react";
import { Copy, Eraser } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const SAMPLE_PATTERN = "opentab|paywalls|wall[s]?";
const SAMPLE_TEXT = "Paywalls are the worst. Crack the wall, fck the signup.\nNo walls in this tab — opentab, build tools.\nwall wall wall";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function RegexLab() {
  const [pattern, setPattern] = useState(SAMPLE_PATTERN);
  const [flags, setFlags] = useState<string[]>(["g", "i"]);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [copied, setCopied] = useState(false);

  const allFlags = [
    { f: "g", d: "global" },
    { f: "i", d: "ignore case" },
    { f: "m", d: "multiline" },
    { f: "s", d: "dotall" },
    { f: "u", d: "unicode" },
    { f: "y", d: "sticky" },
  ];

  const result = useMemo(() => {
    if (!pattern) return { matches: [], groups: [], error: null as string | null };
    try {
      const re = new RegExp(pattern, flags.join(""));
      const matches: string[] = [];
      const groups: (string | undefined)[][] = [];
      if (flags.includes("g") || flags.includes("y")) {
        let m: RegExpExecArray | null;
        const iterative = new RegExp(pattern, flags.join(""));
        while ((m = iterative.exec(text)) !== null) {
          matches.push(m[0]);
          groups.push(m.slice(1));
          if (m[0] === "") iterative.lastIndex++;
        }
      } else {
        const m = text.match(re);
        if (m) {
          matches.push(m[0]);
          groups.push(m.slice(1));
        }
      }
      return { matches, groups, error: null };
    } catch (e) {
      return { matches: [], groups: [], error: (e as Error).message };
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (result.error || !pattern) return escapeHtml(text);
    try {
      const re = new RegExp(pattern, flags.includes("g") || flags.includes("y") ? flags.join("") : `${flags.join("")}g`);
      let out = "";
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) out += escapeHtml(text.slice(last, m.index));
        out += `<mark class="bg-yellow text-ink">${escapeHtml(m[0])}</mark>`;
        last = m.index + m[0].length;
        if (m[0] === "") re.lastIndex++;
      }
      out += escapeHtml(text.slice(last));
      return out;
    } catch {
      return escapeHtml(text);
    }
  }, [pattern, flags, text, result.error]);

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const copy = async () => {
    const out = `const re = /${pattern.replace(/\//g, "\\/")}/${flags.join("")};`;
    await navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="REGEX-LAB"
      title="The lab."
      tagline="Write a pattern, watch it hunt. Live highlighting, match counts, capture groups — all in your tab."
    >
      <div className="mt-10 space-y-6">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">/</span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              spellCheck={false}
              placeholder="your[.]pattern"
              className="min-w-0 flex-1 rounded-md border-2 border-ink bg-surface-muted p-2 font-mono text-sm font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">/</span>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
              {flags.join("") || "—"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {allFlags.map(({ f, d }) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFlag(f)}
                title={d}
                aria-pressed={flags.includes(f)}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  flags.includes(f) ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] Test string
            </h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="mt-4 h-64 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPattern(SAMPLE_PATTERN);
                  setText(SAMPLE_TEXT);
                  setFlags(["g", "i"]);
                }}
                className="uppercase"
              >
                Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setText("")} className="uppercase">
                <Eraser className="h-4 w-4" aria-hidden="true" />
                Clear
              </Button>
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [02] Matches
              </h2>
              <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                    result.error ? "bg-red" : result.matches.length > 0 ? "bg-green" : "bg-ink/20",
                  )}
                />
                {result.error ? "[ ERR ]" : `${result.matches.length} MATCH${result.matches.length === 1 ? "" : "ES"}`}
              </span>
            </div>
            <div
              className="mt-4 h-64 overflow-auto whitespace-pre-wrap rounded-md border-2 border-ink bg-paper p-3 font-mono text-xs leading-relaxed text-ink"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
            {result.groups.length > 0 && (
              <div className="mt-3 rounded-md border-2 border-ink bg-surface-muted p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Capture groups (first match)
                </p>
                <p className="mt-1 break-all font-mono text-xs text-ink">
                  {JSON.stringify(result.groups[0] ?? [])}
                </p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copy()}
                disabled={result.error !== null}
                className="uppercase"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy regex"}
              </Button>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                /{pattern}/{flags.join("")}
              </p>
            </div>
          </section>
        </div>

        {result.error && (
          <p className="rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
            [ ERR ] {result.error}
          </p>
        )}
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Native RegExp engine — matching happens in your tab, in real time.
      </p>
    </ToolShell>
  );
}