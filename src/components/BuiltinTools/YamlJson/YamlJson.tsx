import { useMemo, useState } from "react";
import { FileJson, ArrowRight } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

class YamlError extends Error {}

function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^[-+]?\d+$/.test(v)) return Number(v);
  if (/^[-+]?\d*\.\d+$/.test(v)) return Number(v);
  if (/^[-+]?(0x[0-9a-fA-F]+|\d+[eE][-+]?\d+)$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseInline(raw: string): unknown {
  const v = raw.trim();
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitTop(inner).map((part) => parseInline(part));
  }
  if (v.startsWith("{") && v.endsWith("}")) {
    const inner = v.slice(1, -1).trim();
    const out: Record<string, unknown> = {};
    if (inner) {
      for (const part of splitTop(inner)) {
        const idx = part.indexOf(":");
        if (idx === -1) throw new YamlError(`Bad inline map entry: ${part}`);
        out[part.slice(0, idx).trim()] = parseInline(part.slice(idx + 1));
      }
    }
    return out;
  }
  return parseScalar(v);
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let quote = "";
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseYaml(text: string): unknown {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, ""))
    .filter((l) => l.trim() !== "" && l.trim() !== "---");
  if (lines.length === 0) return null;

  let index = 0;

  function block(indent: number): unknown {
    if (/^-\s/.test(lines[index].trim())) return list(indent);
    return map(indent);
  }

  function list(indent: number): unknown[] {
    const out: unknown[] = [];
    while (index < lines.length) {
      const li = countIndent(lines[index]);
      if (li < indent) break;
      if (li > indent) throw new YamlError(`Bad indentation: ${lines[index]}`);
      const m = lines[index].trim().match(/^-\s*(.*)$/);
      if (!m) break;
      index++;
      const rest = m[1];
      const km = rest.match(/^([\w.-]+):\s*(.*)$/);
      if (km) out.push(mapItem(indent, km));
      else if (rest === "" && index < lines.length && countIndent(lines[index]) > indent) {
        out.push(block(countIndent(lines[index])));
      } else if (rest !== "") out.push(parseInline(rest));
    }
    return out;
  }

  function mapItem(listIndent: number, km: RegExpMatchArray): Record<string, unknown> {
    const item: Record<string, unknown> = {};
    const setKey = (key: string, rest: string, keyIndent: number) => {
      if (rest === "") {
        if (index < lines.length && countIndent(lines[index]) > keyIndent) {
          item[key] = block(countIndent(lines[index]));
        } else item[key] = null;
      } else if (rest === "|") {
        item[key] = readBlockScalar(keyIndent);
      } else item[key] = parseInline(rest);
    };
    setKey(km[1], km[2], listIndent);
    while (index < lines.length) {
      const li = countIndent(lines[index]);
      if (li <= listIndent) break;
      if (/^-\s/.test(lines[index].trim())) throw new YamlError(`Bad indentation: ${lines[index]}`);
      const m = lines[index].trim().match(/^([\w.-]+):\s*(.*)$/);
      if (!m) throw new YamlError(`Cannot parse: ${lines[index]}`);
      const key = m[1];
      const rest = m[2];
      index++;
      setKey(key, rest, li);
    }
    return item;
  }

  function map(indent: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    while (index < lines.length) {
      const li = countIndent(lines[index]);
      if (li < indent) break;
      if (li > indent) throw new YamlError(`Bad indentation: ${lines[index]}`);
      if (/^-\s/.test(lines[index].trim())) break;
      const m = lines[index].trim().match(/^([\w.-]+):\s*(.*)$/);
      if (!m) throw new YamlError(`Cannot parse: ${lines[index]}`);
      const key = m[1];
      const rest = m[2];
      index++;
      if (rest === "") {
        if (index < lines.length && countIndent(lines[index]) > indent) {
          out[key] = block(countIndent(lines[index]));
        } else out[key] = null;
      } else if (rest === "|") {
        out[key] = readBlockScalar(indent);
      } else out[key] = parseInline(rest);
    }
    return out;
  }

  function readBlockScalar(indent: number): string {
    const blockLines: string[] = [];
    while (index < lines.length && countIndent(lines[index]) > indent) {
      blockLines.push(lines[index].slice(indent + 2));
      index++;
    }
    return blockLines.join("\n");
  }

  return block(countIndent(lines[0]));
}

function countIndent(line: string): number {
  return line.length - line.trimStart().length;
}

function toJson(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return "[\n" + value.map((v) => `${padIn}${toJson(v, indent + 1)}`).join(",\n") + `\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return "{\n" + entries.map(([k, v]) => `${padIn}"${k}": ${toJson(v, indent + 1)}`).join(",\n") + `\n${pad}}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function toYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((v) => {
        if (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
          const firstKey = Object.keys(v)[0];
          return `${pad}- ${firstKey}:${toYaml(v[firstKey], indent + 1).slice(0).replace(/^  /, "\n" + pad + "  ")}` +
            (() => {
              const rest = Object.entries(v as Record<string, unknown>).slice(1);
              return rest.length ? "\n" + rest.map(([k, rv]) => `${pad}  ${k}:${toYaml(rv, indent + 2).slice(0).replace(/^  /, "\n" + pad + "    ")}`).join("") : "";
            })();
        }
        return `${pad}- ${toScalarYaml(v)}`;
      })
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => `${pad}${k}:${toScalarOrBlock(v, indent)}`)
      .join("\n");
  }
  return `${pad}${toScalarYaml(value)}`;
}

function toScalarOrBlock(v: unknown, indent: number): string {
  if (typeof v === "object" && v !== null) {
    return "\n" + toYaml(v, indent + 1);
  }
  return " " + toScalarYaml(v);
}

function toScalarYaml(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  const s = String(v);
  if (/[:#\[\]{},&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s) || /^(true|false|null|~|\d+)$/i.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

const SAMPLE_YAML = `# the arsenal config, obviously
name: opentab
free: true
revenue_model: null
languages:
  - typescript
  - css
stack:
  frontend: vite
  worker: cloudflare
  price: 0
features:
  - name: no signup
    speed: instant
  - name: no walls
    speed: also instant
notes: |
  this tool parses a practical subset of yaml
  block scalars are supported
`;
const SAMPLE_JSON = `{
  "name": "opentab",
  "free": true,
  "revenue_model": null,
  "languages": ["typescript", "css"],
  "stack": { "frontend": "vite", "worker": "cloudflare", "price": 0 },
  "features": [
    { "name": "no signup", "speed": "instant" },
    { "name": "no walls", "speed": "also instant" }
  ],
  "notes": "multi-line text stays multi-line"
}
`;

export function YamlJson() {
  const [mode, setMode] = useState<"yaml2json" | "json2yaml">("yaml2json");
  const [input, setInput] = useState(SAMPLE_YAML);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    try {
      if (mode === "yaml2json") {
        const parsed = parseYaml(input);
        return { ok: true as const, value: toJson(parsed, 0) };
      }
      const parsed: unknown = JSON.parse(input);
      return { ok: true as const, value: toYaml(parsed) };
    } catch (e) {
      return { ok: false as const, value: e instanceof Error ? e.message : String(e) };
    }
  }, [mode, input]);

  const copy = async () => {
    if (!output.ok) return;
    await navigator.clipboard.writeText(output.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSample = () => {
    if (mode === "yaml2json") setInput(SAMPLE_YAML);
    else setInput(SAMPLE_JSON);
  };

  return (
    <ToolShell
      crumb="YAML-⇄-JSON"
      title="The shapeshifter."
      tagline="YAML to JSON, JSON to YAML — a practical subset parser, running entirely in your tab."
    >
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("yaml2json")}
          className={cn(
            "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
            mode === "yaml2json" ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
          )}
        >
          YAML → JSON
        </button>
        <button
          type="button"
          onClick={() => setMode("json2yaml")}
          className={cn(
            "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
            mode === "json2yaml" ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
          )}
        >
          JSON → YAML
        </button>
        <span className="mx-1 text-ink/30" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={loadSample}
          className="rounded-md border-2 border-ink bg-yellow/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow"
        >
          Load sample
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Input
            <FileJson className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={22}
            className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Output</h2>
          <textarea
            readOnly
            value={output.value}
            spellCheck={false}
            rows={22}
            className={cn(
              "mt-4 w-full resize-y rounded-md border-2 border-ink p-3 font-mono text-xs leading-relaxed outline-none",
              output.ok ? "bg-ink text-green" : "bg-red/20 text-ink",
            )}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!output.ok} className="uppercase">
              Copy output
            </Button>
            <span className={cn("font-mono text-[11px] font-bold uppercase tracking-widest", output.ok ? "text-green" : "text-red")}>
              {output.ok ? `[ OK ] ${output.value.length.toLocaleString()} chars` : "[ ERROR ]"}
            </span>
            {copied && <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Copied</span>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The parser</h2>
        <p className="mt-3 max-w-3xl font-mono text-[11px] leading-relaxed text-ink/70">
          Hand-rolled indentation parser — no 100 KB dependency. Supports nested maps and lists, inline arrays/maps,
          quoted and plain scalars, numbers, booleans, null, comments and block scalars (|). Anchors, aliases,
          multi-document streams and JSON-style YAML edge cases are not supported. If your YAML is exotic, this will
          tell you honestly.
        </p>
      </section>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Parsed locally — your config never leaves the tab.
      </p>
    </ToolShell>
  );
}