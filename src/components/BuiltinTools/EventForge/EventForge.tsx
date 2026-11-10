import { useMemo, useState } from "react";
import { CalendarPlus, Copy, Download } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const REMINDERS = [
  { label: "No reminder", trigger: null },
  { label: "10 minutes before", trigger: "-PT10M" },
  { label: "30 minutes before", trigger: "-PT30M" },
  { label: "1 hour before", trigger: "-PT1H" },
  { label: "1 day before", trigger: "-P1D" },
] as const;

const escIcs = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const fold = (s: string): string => {
  const lines: string[] = [];
  for (let i = 0; i < s.length; i += 73) lines.push(s.slice(i, i + 73));
  return lines.join("\r\n ");
};

const uid = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function EventForge() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reminder, setReminder] = useState<(typeof REMINDERS)[number]["trigger"]>("-PT30M");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ics = useMemo(() => {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Give the event a title.");
      return "";
    }
    if (!start || !end) {
      setError("Pick a start and an end.");
      return "";
    }
    if (end <= start) {
      setError("The end must come after the start.");
      return "";
    }
    const fmtUtc = (v: string) => new Date(v).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const fmtDate = (v: string) => v.replace(/-/g, "");
    const nextDay = (v: string) => {
      const d = new Date(`${v}T00:00:00`);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const dtstart = allDay ? `DTSTART;VALUE=DATE:${fmtDate(start)}` : `DTSTART:${fmtUtc(start)}Z`;
    const dtend = allDay ? `DTEND;VALUE=DATE:${fmtDate(nextDay(end))}` : `DTEND:${fmtUtc(end)}Z`;
    const alarm =
      reminder === null
        ? ""
        : `\r\nBEGIN:VALARM\r\nTRIGGER:${reminder}\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nEND:VALARM`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OpenTab//EVENT-FORGE//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid()}@opentab`,
      `DTSTAMP:${fmtUtc(new Date().toISOString())}Z`,
      dtstart,
      dtend,
      `SUMMARY:${escIcs(t)}`,
      desc.trim() ? `DESCRIPTION:${escIcs(desc.trim())}` : "",
      location.trim() ? `LOCATION:${escIcs(location.trim())}` : "",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
    return fold(`${lines}${alarm}\r\nEND:VCALENDAR\r\n`);
  }, [title, desc, location, allDay, start, end, reminder]);

  const download = () => {
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.trim().replace(/[^\w-]+/g, "-").toLowerCase() || "event"}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async () => {
    if (!ics) return;
    await navigator.clipboard.writeText(ics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls =
    "mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

  return (
    <ToolShell
      crumb="EVENT-FORGE"
      title="The invite."
      tagline="Fill in the when and where, get a real .ics file — reminder included, imports into Google Calendar, Apple Calendar, Outlook and friends. The event sites bill per event and keep your guest list."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The event
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          </h2>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quarterly review"
              className={inputCls}
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Start</span>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">End</span>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              All-day event
            </span>
            {allDay && (
              <span className="ml-auto font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
                end date is exclusive
              </span>
            )}
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Description
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Agenda, links, what to bring…"
              className={`${inputCls} h-20 resize-y`}
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room 4B or https://meet.example…"
              className={inputCls}
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Reminder</span>
            <select
              value={reminder ?? ""}
              onChange={(e) =>
                setReminder((e.target.value === "" ? null : e.target.value) as (typeof REMINDERS)[number]["trigger"])
              }
              className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
            >
              {REMINDERS.map((r) => (
                <option key={r.label} value={r.trigger ?? ""}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] .ics out</h2>
          <pre className="mt-4 h-80 flex-1 overflow-auto rounded-md border-2 border-ink bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink">
            {ics || <span className="text-ink/30">// The .ics body appears here — fill in the event first.</span>}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={download} disabled={!ics} className="uppercase">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download .ics
            </Button>
            <Button variant="secondary" onClick={() => void copy()} disabled={!ics} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy ICS"}
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            {ics ? `[ OK ] ${ics.length.toLocaleString()} BYTES — VALARM ${reminder ? "INCLUDED" : "SKIPPED"}` : "[ IDLE ]"}
          </p>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Times export in UTC — your calendar shows them in your own zone automatically.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Double-click the .ics anywhere — the file format is open, which is exactly why the invite sites sell you the wrapper.
      </p>
    </ToolShell>
  );
}