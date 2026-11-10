import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Wordmark } from "../../branding/Wordmark";
import { Button } from "../../ui/button";
import { FALLBACK_REPO_STARS } from "../../../constants/fallbackData";
import { REPO_URL } from "../../../constants/global";
import { useModal } from "../../../hooks/useModal";
import { StarIcon } from "../../../constants/icons";
import { cn } from "../../../utils/cn";

interface HeaderProps {
  toolCount: number;
  categoryCount: number;
  setSearchQuery: (query: string) => void;
  activeView: "index" | "tools";
}

export function Header({
  toolCount,
  categoryCount,
  setSearchQuery,
  activeView,
}: HeaderProps) {
  const { showModalWithID } = useModal();
  const [starsCount, setStarsCount] = useState("????");

  useEffect(() => {
    setRepoStars(setStarsCount);
  }, []);

  function goToIndex() {
    setSearchQuery("");
    if (window.location.hash !== "#/index") {
      window.location.hash = "#/index";
    }
  }

  return (
    <header className="border-b-4 border-ink bg-paper">
      <div className="page-container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0"
            onClick={goToIndex}
            aria-label="OpenTab — back to all tools"
          >
            <Wordmark />
          </button>

          <nav aria-label="Sections" className="flex gap-2">
            <a
              href="#/index"
              target="_self"
              aria-current={activeView === "index" ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-md border-2 border-ink bg-surface px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-150 ease-brutal hover:-translate-y-[2px] hover:bg-yellow active:translate-y-0",
                activeView === "index" && "bg-yellow shadow-brutal-sm",
              )}
            >
              [ 01 ] Index
            </a>
            <a
              href="#/tools"
              target="_self"
              aria-current={activeView === "tools" ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-md border-2 border-ink bg-surface px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-150 ease-brutal hover:-translate-y-[2px] hover:bg-yellow active:translate-y-0",
                activeView === "tools" && "bg-yellow shadow-brutal-sm",
              )}
            >
              [ 02 ] Tools
            </a>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href="https://github.com/vaibhxvvy/opentab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`GitHub repository, current stars: ${starsCount}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border-[3px] border-ink bg-yellow px-2.5 font-mono text-[11px] font-bold text-ink shadow-brutal-sm transition-[transform,box-shadow] duration-150 ease-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[5px] active:translate-y-[5px] active:shadow-none"
          >
            {starsCount}
            <StarIcon className="h-3 w-3" />
          </a>

          <div className="flex flex-wrap items-center gap-x-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/70">
            <span>
              [<span className="text-ink">{String(toolCount).padStart(3, "0")}</span>] TOOLS
            </span>
            <span>
              [<span className="text-ink">{String(categoryCount).padStart(3, "0")}</span>] CATEGORIES
            </span>
          </div>

          <Button size="sm" onClick={() => showModalWithID("submit-tool")} className="uppercase">
            Break the wall
          </Button>
        </div>
      </div>
    </header>
  );
}

interface RepoData {
  stargazers_count: number;
}

async function fetchRepoData(): Promise<RepoData | null> {
  try {
    const response = await fetch(REPO_URL);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data: RepoData = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch repo's data: ${error}`);
    return null;
  }
}

async function setRepoStars(setStarsCount: Dispatch<SetStateAction<string>>) {
  const repo = await fetchRepoData();
  const repoStars = repo?.stargazers_count?.toString() || FALLBACK_REPO_STARS;
  setStarsCount(repoStars);
}