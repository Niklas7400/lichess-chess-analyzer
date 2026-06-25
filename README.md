# Lichess Chess Analyzer

Ein Python-Skript zur automatisierten Analyse von Lichess-Partien eines bestimmten Benutzers.  
Das Skript verwendet **Stockfish** zur Bewertung der Züge und **OpenAI GPT** (z. B. `gpt-4o-mini`) zur Erstellung einer verständlichen Partieanalyse und Verbesserungstipps.

---

## Features

- Abrufen der neuesten Partien eines Lichess-Users via API
- Bewertung aller Züge mit Stockfish (Delta-Analyse)
- Kategorisierung von Zügen: Blunder, Fehler, sehr guter Zug
- Automatische GPT-Analyse mit kommentierten Verbesserungsvorschlägen
- Speicherung der Analyse pro Partie als JSON-Datei (nach Gegner benannt)

---

## Voraussetzungen

- Python ≥3.10
- [Stockfish](https://stockfishchess.org/download/) installiert und im Systempfad
- Lichess-Benutzername
- OpenAI API-Key

---

## Installation

```bash
git clone https://github.com/Niklas7400/lichess-chess-analyzer.git
cd lichess-chess-analyzer
pip install -r requirements.txt

