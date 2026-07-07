# Lichess Chess Analyzer — Web

Next.js-Frontend fuer das Python-Tool [`analyze_lichess.py`](../analyze_lichess.py):
Lichess-Partien eines Users werden per Stockfish bewertet und von GPT
kommentiert; dieses Projekt macht das Ergebnis ueber eine Web-Oberflaeche
nutzbar.

## Architektur

```
Browser  ──POST /api/analyze──▶  Next.js API-Route  ──spawn──▶  analyze_lichess.py
   ▲                                     │                            │
   │                                     │  liest JSON-Dateien        │ schreibt pro Partie
   └─────────────JSON-Response───────────┘◀───────────────────────────┘  eine JSON-Datei
```

- **`src/app/page.tsx`** — Client Component mit Formular, Lade-/Fehlerzustand
  und Ergebnisanzeige (Partienliste + Detailansicht).
- **`src/app/api/analyze/route.ts`** — Next.js Route Handler. Validiert den
  Usernamen, startet das Python-Skript als Kindprozess in einem eindeutigen
  Output-Verzeichnis, liest die erzeugten JSON-Dateien ein und raeumt danach
  wieder auf.
- **`src/lib/pythonAnalysis.ts`** — kapselt `child_process.spawn`: startet
  `analyze_lichess.py`, sammelt stdout/stderr, mappt Exit-Codes auf
  HTTP-Fehler und parst die letzte stdout-Zeile (`RESULT_JSON:{...}`) als
  Manifest der erzeugten Dateien.
- **`src/components/`** — `AnalyzeForm`, `GameList`, `GameDetail`: reine
  Praesentationskomponenten, bekommen Daten/Callbacks per Props.

## Kontrakt mit dem Python-Skript

`analyze_lichess.py` wird per CLI aufgerufen:

```bash
python analyze_lichess.py --username <name> --max-games <n> --output-dir <dir>
```

Benoetigte Umgebungsvariablen: `OPENAI_API_KEY` (Pflicht), `STOCKFISH_PATH`
(optional, Default `/usr/games/stockfish`).

Das Skript schreibt Fortschritt auf **stderr** und gibt als letzte Zeile auf
**stdout** ein JSON-Manifest aus (Prefix `RESULT_JSON:`), das fuer jede
Partie den Pfad der geschriebenen Ergebnisdatei enthaelt. Exit-Codes:

| Code | Bedeutung                          | HTTP-Status |
|------|-------------------------------------|-------------|
| 1    | Konfigurationsfehler (Key/Stockfish/Lichess-API) | 500 |
| 2    | Lichess-User nicht gefunden          | 404 |
| 3    | Keine Partien gefunden               | 404 |
| 4    | GPT-Anfrage fehlgeschlagen           | 502 |

## Setup

```bash
cp .env.local.example .env.local
# .env.local ausfuellen: Pfade zu Python-Interpreter/Skript, OPENAI_API_KEY

npm install
npm run dev
```

Das Python-Skript braucht eine eigene venv im Repo-Root (`../.venv`) mit
`pip install -r ../requirements.txt` sowie eine lokale Stockfish-Installation.
