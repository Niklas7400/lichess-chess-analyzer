import type { GameAnalysis } from "@/lib/types";
import { RESULT_STYLES, formatDate } from "@/lib/evaluation";

interface Props {
  games: GameAnalysis[];
  selected: GameAnalysis | null;
  onSelect: (game: GameAnalysis) => void;
}

export default function GameList({ games, selected, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {games.map((game) => {
        const isSelected = selected?.game_number === game.game_number;
        return (
          <li key={game.game_number}>
            <button
              type="button"
              onClick={() => onSelect(game)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">vs. {game.opponent}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${RESULT_STYLES[game.result] ?? "bg-gray-200 text-gray-700"}`}>
                  {game.result}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {formatDate(game.date)} &middot; du: {game.user_color}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
