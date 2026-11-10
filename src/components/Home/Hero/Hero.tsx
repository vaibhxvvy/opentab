import { FormEvent } from "react";
import { Button } from "../../ui/button";
import { BrickWall } from "../../decoration/BrickWall";

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Hero({ searchQuery, setSearchQuery }: HeroProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    document
      .getElementById("main-content")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="relative overflow-hidden border-b-4 border-ink">
      <div className="page-container relative grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:gap-8">
        <BrickWall
          className="absolute -top-2 -left-6 h-40 w-40 -rotate-12 opacity-90 lg:left-[45%]"
          role="img"
          label="A red brick wall"
        />

        <div className="relative z-10 lg:col-span-7">
          <p className="mb-4 inline-block rounded-sm border-2 border-ink bg-ink px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-paper">
            [ OPEN INDEX ] — NO SIGNUPS. NO EMAILS. NO BULLSH*T.
          </p>
          <h1 className="font-display text-[clamp(2.75rem,9vw,6.5rem)] font-bold uppercase leading-[0.95] tracking-tight">
            The internet
            <br />
            has walls.
            <br />
            <span className="relative inline-block bg-yellow px-3 text-ink shadow-brutal-sm">
              We collect
              <br />
              the keys.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg font-medium text-ink/80">
            Every tool in this index works instantly in your browser. No
            accounts. No logins. No paywalls. The wall is the problem — these
            are the solutions.
          </p>
        </div>

        <div className="relative z-10 flex flex-col justify-end lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-lg sm:p-5"
            role="search"
          >
            <label
              htmlFor="hero-search"
              className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70"
            >
              01 // SEARCH THE INDEX
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="hero-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 200+ no-wall tools..."
                aria-label="Search tools by name, tag, or description"
                autoComplete="off"
                className="h-12 w-full rounded-md border-[3px] border-ink bg-white px-4 font-sans text-base placeholder:text-ink/40 transition-[box-shadow,transform] duration-150 ease-brutal focus:outline-none focus:-translate-x-[2px] focus:-translate-y-[2px] focus:shadow-brutal-sm"
              />
              <Button type="submit" size="lg" className="shrink-0 uppercase">
                Find it
              </Button>
            </div>
            <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              type: name / tag / description
            </p>
          </form>

          <p className="mt-4 rounded-md border-2 border-dashed border-ink/40 p-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
            [ SYSTEM ] FOUND A TOOL THAT ASKS FOR AN EMAIL?{" "}
            <a
              href="https://github.com/vaibhxvvy/opentab/issues/new?template=request-to-add-a-tool.md"
              className="text-ink underline decoration-red decoration-2 underline-offset-2 hover:bg-yellow"
            >
              KILL IT
            </a>
          </p>
        </div>
      </div>

      <BrickWall />
    </section>
  );
}