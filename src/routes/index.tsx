import { createFileRoute } from "@tanstack/react-router";
import { GameView } from "@/game/GameView";
import { articleDateHead } from "@/lib/page-date";
import { PAGE_DATES } from "@/lib/page-dates.generated";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => articleDateHead(PAGE_DATES["/"] ?? {}),
});

function Home() {
  return <GameView />;
}
