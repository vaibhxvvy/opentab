import { cn } from "../../utils/cn";

interface WordmarkProps {
  className?: string;
  compact?: boolean;
}

export function Wordmark({ className, compact = false }: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex select-none flex-col items-start rounded-md border-[3px] border-ink bg-yellow px-2 py-1 shadow-brutal-sm",
          compact && "px-1.5 py-0.5",
        )}
      >
        <span
          className={cn(
            "font-display text-2xl font-bold uppercase leading-none tracking-tight",
            compact && "text-lg",
          )}
        >
          OPEN
        </span>
        <span
          className={cn(
            "font-display text-xl font-bold uppercase leading-none tracking-tight",
            compact && "text-base",
          )}
        >
          TAB
        </span>
      </span>
      <span
        aria-hidden="true"
        className="hidden font-mono text-[10px] font-semibold uppercase leading-tight tracking-widest text-ink/50 sm:block"
      >
        the wall
        <br />
        is the problem
      </span>
    </span>
  );
}