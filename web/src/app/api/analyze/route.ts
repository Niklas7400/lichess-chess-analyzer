import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { PythonProcessError, runPythonAnalysis } from "@/lib/pythonAnalysis";
import type { AnalyzeResponse, GameAnalysis } from "@/lib/types";

// Lichess erlaubt Buchstaben, Ziffern, Unterstrich und Bindestrich (2-30 Zeichen).
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;
const MAX_GAMES_LIMIT = 20;

export async function POST(req: NextRequest) {
  const pythonBin = process.env.PYTHON_BIN;
  const scriptPath = process.env.PYTHON_SCRIPT;
  const outputRoot = process.env.PYTHON_OUTPUT_DIR;

  if (!pythonBin || !scriptPath || !outputRoot) {
    return NextResponse.json(
      { error: "Server ist nicht konfiguriert: PYTHON_BIN, PYTHON_SCRIPT oder PYTHON_OUTPUT_DIR fehlt in .env.local." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const maxGames = Math.min(Number(body?.maxGames) || 5, MAX_GAMES_LIMIT);

  if (!username || !USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Bitte einen gueltigen Lichess-Usernamen angeben." }, { status: 400 });
  }

  const outputDir = path.join(outputRoot, randomUUID());

  try {
    const manifest = await runPythonAnalysis({ pythonBin, scriptPath, username, maxGames, outputDir });

    const games: GameAnalysis[] = await Promise.all(
      manifest.games.map(async (game) => {
        const raw = await readFile(game.file, "utf-8");
        return JSON.parse(raw) as GameAnalysis;
      })
    );

    const result: AnalyzeResponse = { username: manifest.username, games };
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PythonProcessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unerwarteter Fehler bei der Analyse." }, { status: 500 });
  } finally {
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
}
