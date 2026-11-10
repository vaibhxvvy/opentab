import { useState } from "react";
import { Code2, Copy, Eraser, Sparkles } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const SAMPLE = {
  id: 234,
  name: "opentab",
  live: true,
  tags: ["tools", "no-signup"],
  meta: {
    created: "2026-08-15",
    owner: { id: 1, handle: "vaibhxvvy" },
  },
};

function sanitizeName(raw: string, taken: Set<string>): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  let name = cleaned || "Item";
  name = name.charAt(0).toUpperCase() + name.slice(1);
  let unique = name;
  let n = 2;
  while (taken.has(unique)) {
    unique = `${name}${n++}`;
  }
  taken.add(unique);
  return unique;
}

function tsify(value: unknown, indent: string, taken: Set<string>): string {
  const pad = `${indent}  `;
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const itemTypes = [...new Set(value.map((v) => tsify(v, pad, taken)))];
    return itemTypes.length === 1 ? `${itemTypes[0]}[]` : `(${itemTypes.join(" | ")})[]`;
  }
  if (typeof value === "object") {
    const name = sanitizeName("Generated", taken);
    taken.add(name);
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "Record<string, unknown>";
    const lines = entries.map(([k, v]) => `${pad}${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`}: ${tsify(v, pad, taken)};`);
    return `interface ${name} {\n${lines.join("\n")}\n${indent}}`;
  }
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "unknown";
}

export function JsonToTs() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const convert = () => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      const taken = new Set<string>();
      const result = tsify(parsed, "", taken);
      setOutput(result);
    } catch (e) {
      setOutput("");
      setError(`INVALID JSON — ${(e as Error).message}`);
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="JSON-TO-TS"
      title="The typegen."
      tagline="Paste JSON, walk out with TypeScript interfaces. Nested objects, arrays, unions — typed in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] JSON in
            <Code2 className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder='{"id": 1, "name": "fcuk"}'
            className="mt-4 h-80 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={convert} disabled={!input} className="uppercase">
              Generate types
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInput(JSON.stringify(SAMPLE, null, 2));
                setOutput("");
                setError(null);
              }}
              className="uppercase"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("");
                setOutput("");
                setError(null);
              }}
              className="uppercase"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Types out
          </h2>
          <textarea
            readOnly
            value={output}
            spellCheck={false}
            placeholder="Generated interfaces land here…"
            className="mt-4 h-80 w-full flex-1 resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!output}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  error ? "bg-red" : output ? "bg-green" : "bg-ink/20",
                )}
              />
              {error ? "[ ERR ] INVALID JSON" : output ? "[ OK ] TYPES GENERATED" : "[ IDLE ] WAITING FOR INPUT"}
            </span>
          </div>
        </section>
      </div>

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Hand-rolled generator — arrays become unions, nested objects become interfaces. All local.
      </p>
    </ToolShell>
  );
}