import type { GameAnalysis } from "@/lib/types";
import { evaluationStyles, formatDate } from "@/lib/evaluation";

interface Props {
  game: GameAnalysis;
  username: string;
}

export default function GameDetail({ game, username }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {username} ({game.user_color}) vs. {game.opponent}
        </h2>
        <span className="text-sm font-medium text-gray-500">{game.result}</span>
      </div>
      <p className="mb-4 text-xs text-gray-500">{formatDate(game.date)}</p>

      {game.error && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Die GPT-Analyse konnte fuer diese Partie nicht vollstaendig ausgewertet werden.
        </div>
      )}

      {game.moves.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Zug</th>
                <th className="px-3 py-2">Bewertung</th>
                <th className="px-3 py-2">Kommentar</th>
                <th className="px-3 py-2">Besserer Zug</th>
              </tr>
            </thead>
            <tbody>
              {game.moves.map((move) => {
                const styles = evaluationStyles(move.evaluation);
                return (
                  <tr key={move.move_number} className={`border-t border-gray-100 ${styles.bg}`}>
                    <td className="px-3 py-2 text-gray-400">{move.move_number}</td>
                    <td className="px-3 py-2 font-mono text-gray-900">{move.san}</td>
                    <td className={`px-3 py-2 font-medium ${styles.text}`}>{move.evaluation}</td>
                    <td className="px-3 py-2 text-gray-700">{move.kommentar}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">{move.bester_zug}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {game.tipps.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Tipps zur Verbesserung</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {game.tipps.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
