# Lichess Chess Analyzer

Ein Python-Skript zur automatisierten Analyse von Lichess-Partien eines bestimmten Benutzers.  
Das Skript verwendet **Stockfish** zur Bewertung der Züge und **OpenAI GPT** (z. B. `gpt-5.4-mini`) zur Erstellung einer verständlichen Partieanalyse und Verbesserungstipps.

---

## Features

- Abrufen der neuesten Partien eines Lichess-Users via API
- Bewertung aller Züge mit Stockfish (Delta-Analyse), farbkorrekt aus Sicht des analysierten Spielers
- Kategorisierung von Zügen: Blunder, Fehler, sehr guter Zug
- Automatische GPT-Analyse mit kommentierten Verbesserungsvorschlägen
- Speicherung der Analyse pro Partie als JSON-Datei (nach Gegner benannt)
- Next.js-Weboberfläche im Ordner [`web/`](web/) als Frontend für das Skript

---

## Voraussetzungen

- Python ≥3.10
- [Stockfish](https://stockfishchess.org/download/) installiert (Pfad per `STOCKFISH_PATH` konfigurierbar)
- Lichess-Benutzername
- OpenAI API-Key

---

## Installation & Nutzung (CLI)

```bash
git clone https://github.com/Niklas7400/lichess-chess-analyzer.git
cd lichess-chess-analyzer

python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

export OPENAI_API_KEY=sk-...
# optional, falls Stockfish nicht unter /usr/games/stockfish liegt:
export STOCKFISH_PATH=/pfad/zu/stockfish

.venv/bin/python analyze_lichess.py --username <lichess-username> --max-games 5 --output-dir output
```

Ergebnis: pro Partie eine JSON-Datei in `output/` mit Zügen, Bewertungen,
GPT-Kommentaren und Verbesserungstipps.

---

## Weboberfläche

Im Ordner [`web/`](web/) liegt ein Next.js-Frontend, das dieses Skript als
Backend anspricht (Formular → API-Route → Python-Prozess → Ergebnisanzeige).
Setup und Architektur: [web/README.md](web/README.md).
