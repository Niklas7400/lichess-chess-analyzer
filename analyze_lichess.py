import requests
import chess
import chess.pgn
import chess.engine
import io
import json
import os
from openai import OpenAI

# --- Einstellungen ---
STOCKFISH_PATH = "/usr/games/stockfish"  # ggf. anpassen
username = "Nikelele"
max_games = 1
OPENAI_API_KEY = "DEIN_API_KEY_HIER"

# --- Engine Setup ---
engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

# --- OpenAI Setup ---
client = OpenAI(api_key=OPENAI_API_KEY)

# --- Lichess API ---
url = f"https://lichess.org/api/games/user/{username}?max={max_games}&pgnInJson=true"
response = requests.get(url, headers={"Accept": "application/x-ndjson"})
response.raise_for_status()

def move_label(delta):
    if delta is None:
        return "Keine Bewertung"
    elif delta >= 50:
        return "Sehr guter Zug"
    elif delta <= -50:
        return "Blunder"
    elif delta <= -100:
        return "Fehler"
    else:
        return "keiner nötig"

# --- Partien abrufen ---
games_json = response.text.strip().split("\n")
all_games_data = []

for game_idx, game_line in enumerate(games_json, start=1):
    game_data = json.loads(game_line)
    pgn_text = game_data["pgn"]
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        continue

    board = game.board()
    analysis_data = []

    # Gegner ermitteln
    try:
        white_player = game_data["players"]["white"]["user"]["name"]
    except:
        white_player = "White"
    try:
        black_player = game_data["players"]["black"]["user"]["name"]
    except:
        black_player = "Black"

    opponent = black_player if white_player.lower() == username.lower() else white_player

    for move_number, move in enumerate(game.mainline_moves(), start=1):
        info_before = engine.analyse(board, chess.engine.Limit(depth=14))
        score_before = info_before.get("score")
        eval_before = None
        if score_before:
            try:
                eval_before = score_before.white().score(mate_score=100000)
            except:
                pass

        san = board.san(move)
        board.push(move)

        info_after = engine.analyse(board, chess.engine.Limit(depth=14))
        score_after = info_after.get("score")
        eval_after = None
        if score_after:
            try:
                eval_after = score_after.white().score(mate_score=100000)
            except:
                pass

        delta = None if eval_before is None or eval_after is None else eval_after - eval_before
        analysis_data.append({
            "move_number": move_number,
            "san": san,
            "fen": board.fen(),
            "eval_before": eval_before,
            "eval_after": eval_after,
            "delta": delta,
            "evaluation": move_label(delta)
        })

    all_games_data.append({
        "game_number": game_idx,
        "opponent": opponent,
        "moves": analysis_data
    })

engine.quit()
print(f"{len(all_games_data)} Partien analysiert.")

# --- GPT Analyse pro Partie ---
for game in all_games_data:
    game_number = game["game_number"]
    opponent = game["opponent"]
    moves_data = game["moves"]

    prompt = f"""
Du bist ein Schachtrainer und analysierst die Partie aus der Perspektive von {username}.
Analysiere nur die Züge von {username}.

Gehe Zug für Zug durch und markiere Fehler, Blunder oder sehr gute Züge (basierend auf Bewertung).
Kleine Ungenauigkeiten werden ignoriert.
Erkläre kurz, warum der Zug ein Fehler/Blunder/Ungenauigkeit ist.
Schlage einen besseren Zug vor, falls nötig.
Wenn der Zug sehr gut war oder theoretisch korrekt ist, markiere dies ebenfalls.
Gib nach der Partie allgemeine Tipps zur Verbesserung.

Datenformat: JSON
{{
    "game_number": {game_number},
    "opponent": "{opponent}",
    "moves": [
        {{
            "move_number": int,
            "san": str,
            "evaluation": "Sehr guter Zug / Theoretisch korrekt / Blunder / Fehler",
            "kommentar": str,
            "bester_zug": str oder "keiner nötig"
        }},
        ...
    ],
    "tipps": ["Tipp 1", "Tipp 2", ...]
}}

Partie-Züge:
{json.dumps(moves_data)}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    content = ""
    try:
        content = response.choices[0].message.content.strip()
    except:
        content = ""

    safe_opponent = opponent.replace(" ", "_").replace("/", "_")
    output_file = f"{username}_vs_{safe_opponent}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Analyse Partie {game_number} gegen {opponent} abgeschlossen und gespeichert in: {output_file}")
