"use client";

import { FormEvent, useState } from "react";
import Spinner from "./Spinner";

const GAME_COUNT_OPTIONS = [1, 3, 5, 10];

interface Props {
  loading: boolean;
  onSubmit: (username: string, maxGames: number) => void;
}

export default function AnalyzeForm({ loading, onSubmit }: Props) {
  const [username, setUsername] = useState("");
  const [maxGames, setMaxGames] = useState(5);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    onSubmit(trimmed, maxGames);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
            Lichess-Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="z. B. DrNykterstein"
            disabled={loading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="maxGames" className="mb-1 block text-sm font-medium text-gray-700">
            Partien
          </label>
          <select
            id="maxGames"
            value={maxGames}
            onChange={(event) => setMaxGames(Number(event.target.value))}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-100"
          >
            {GAME_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading && <Spinner />}
          {loading ? "Analysiere..." : "Analysieren"}
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Die Analyse ruft Stockfish und GPT pro Zug auf und kann je nach Partienanzahl ein bis mehrere Minuten dauern.
      </p>
    </form>
  );
}
