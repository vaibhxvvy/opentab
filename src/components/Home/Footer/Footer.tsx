import { ExternalLink } from "lucide-react";
import { useModal } from "../../../hooks/useModal";
import { Button } from "../../ui/button";

export function Footer() {
  const { showModalWithID } = useModal();

  return (
    <footer className="border-t-4 border-ink bg-ink text-paper">
      <div className="page-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">
            About
          </h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/70">
            OpenTab is a curated index of tools that respect your time.
            No accounts. No spam. No dark patterns. The wall is the problem —
            these are the solutions.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">
            Contribute
          </h3>
          <div className="mt-3 flex flex-col items-start gap-2">
            <Button
              size="sm"
              onClick={() => showModalWithID("submit-tool")}
              className="uppercase"
            >
              Break the wall
            </Button>
            <a
              href="https://github.com/vaibhxvvy/opentab/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-paper/70 underline-offset-2 hover:text-yellow hover:underline"
            >
              Report an issue <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">
            Legal
          </h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/70">
            All tools are independently verified. We don&apos;t track you. We
            don&apos;t sell data. We don&apos;t care about your email. Ever.
          </p>
        </div>
      </div>

      <div className="border-t-2 border-paper/20">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper/60">
            © 2026 OpenTab /// CURATED WITH SPITE
          </p>
          <a
            href="https://github.com/vaibhxvvy/opentab"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper/60 underline-offset-2 hover:text-yellow hover:underline"
          >
            GITHUB ↗
          </a>
        </div>
      </div>
    </footer>
  );
}