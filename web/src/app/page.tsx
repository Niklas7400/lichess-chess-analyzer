"use client";

import { useState } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import GameDetail from "@/components/GameDetail";
import GameList from "@/components/GameList";
import type { AnalyzeResponse, GameAnalysis } from "@/lib/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameAnalysis | null>(null);

  async function handleAnalyze(username: string, maxGames: number) {
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedGame(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, maxGames }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Analyse fehlgeschlagen.");
      }

      const result = body as AnalyzeResponse;
      setData(result);
      setSelectedGame(result.games[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Lichess Chess Analyzer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analysiert die letzten Partien eines Lichess-Users mit Stockfish und GPT.
        </p>
      </header>

      <AnalyzeForm onSubmit={handleAnalyze} loading={loading} />

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && data.games.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          <GameList games={data.games} selected={selectedGame} onSelect={setSelectedGame} />
          {selectedGame && <GameDetail game={selectedGame} username={data.username} />}
        </div>
      )}
    </main>
  );
}
