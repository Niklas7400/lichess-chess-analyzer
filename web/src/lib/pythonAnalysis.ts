import { spawn } from "node:child_process";

/**
 * analyze_lichess.py schreibt Fortschritt auf stderr und gibt als letzte
 * stdout-Zeile ein JSON-Manifest aus, das mit diesem Marker beginnt.
 * Siehe RESULT_MARKER in analyze_lichess.py.
 */
const RESULT_MARKER = "RESULT_JSON:";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export class PythonProcessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PythonProcessError";
    this.status = status;
  }
}

// Exit-Codes sind in analyze_lichess.py definiert (sys.exit(...)).
const EXIT_CODE_MESSAGES: Record<number, { message: string; status: number }> = {
  1: { message: "Server-Konfigurationsfehler (Stockfish-Pfad, OpenAI-Key oder Lichess-API pruefen).", status: 500 },
  2: { message: "Dieser Lichess-User wurde nicht gefunden.", status: 404 },
  3: { message: "Fuer diesen User wurden keine Partien gefunden.", status: 404 },
  4: { message: "Die GPT-Analyse ist fehlgeschlagen (OpenAI-API).", status: 502 },
};

export interface ManifestGame {
  game_number: number;
  opponent: string;
  date: string | null;
  result: string;
  file: string;
  error: string | null;
}

export interface AnalysisManifest {
  username: string;
  output_dir: string;
  games: ManifestGame[];
}

interface RunOptions {
  pythonBin: string;
  scriptPath: string;
  username: string;
  maxGames: number;
  outputDir: string;
  timeoutMs?: number;
}

export function runPythonAnalysis({
  pythonBin,
  scriptPath,
  username,
  maxGames,
  outputDir,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunOptions): Promise<AnalysisManifest> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin,
      [scriptPath, "--username", username, "--max-games", String(maxGames), "--output-dir", outputDir],
      { env: process.env }
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new PythonProcessError(`Python-Prozess konnte nicht gestartet werden: ${err.message}`, 500));
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (timedOut) {
        reject(new PythonProcessError("Die Analyse hat das Zeitlimit ueberschritten.", 504));
        return;
      }

      if (code !== 0) {
        const known = code !== null ? EXIT_CODE_MESSAGES[code] : undefined;
        reject(
          new PythonProcessError(
            known?.message ?? `Analyse fehlgeschlagen (Code ${code}): ${stderr.trim() || "unbekannter Fehler"}`,
            known?.status ?? 500
          )
        );
        return;
      }

      const resultLine = stdout.split("\n").find((line) => line.startsWith(RESULT_MARKER));
      if (!resultLine) {
        reject(new PythonProcessError("Konnte Analyse-Ergebnis nicht lesen (kein RESULT_JSON in der Skript-Ausgabe).", 500));
        return;
      }

      try {
        resolve(JSON.parse(resultLine.slice(RESULT_MARKER.length)) as AnalysisManifest);
      } catch {
        reject(new PythonProcessError("Analyse-Ergebnis war kein gueltiges JSON.", 500));
      }
    });
  });
}
