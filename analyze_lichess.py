import argparse
import io
import json
import os
import sys

import chess
import chess.engine
import chess.pgn
import requests
from openai import OpenAI

RESULT_MARKER = "RESULT_JSON:"


def parse_args():
    parser = argparse.ArgumentParser(description="Analysiert Lichess-Partien eines Users mit Stockfish + GPT.")
    parser.add_argument("--username", required=True, help="Lichess-Benutzername")
    parser.add_argument("--max-games", type=int, default=5, help="Maximale Anzahl an Partien (default: 5)")
    parser.add_argument("--output-dir", default="output", help="Verzeichnis fuer die Ergebnis-JSON-Dateien")
    parser.add_argument("--depth", type=int, default=14, help="Stockfish-Suchtiefe pro Zug")
    return parser.parse_args()


def move_label(delta):
    if delta is None:
        return "Keine Bewertung"
    elif delta >= 50:
        return "Sehr guter Zug"
    elif delta <= -100:
        return "Blunder"
    elif delta <= -50:
        return "Fehler"
    else:
        return "keiner noetig"


def result_for(username, white_player, winner):
    is_white = white_player.lower() == username.lower()
    if winner is None:
        return "Remis"
    if (winner == "white") == is_white:
        return "Sieg"
    return "Niederlage"


def extract_json(content):
    """GPT antwortet manchmal mit ```json ... ``` Codefences. Die entfernen und parsen."""
    text = content.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[len("json"):]
        text = text.strip()
    return json.loads(text)


def main():
    args = parse_args()
    username = args.username

    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        print("Fehler: Umgebungsvariable OPENAI_API_KEY ist nicht gesetzt.", file=sys.stderr)
        sys.exit(1)

    stockfish_path = os.environ.get("STOCKFISH_PATH", "/usr/games/stockfish")
    if not os.path.exists(stockfish_path):
        print(f"Fehler: Stockfish nicht gefunden unter '{stockfish_path}'.", file=sys.stderr)
        sys.exit(1)

    # --- Lichess API ---
    url = f"https://lichess.org/api/games/user/{username}?max={args.max_games}&pgnInJson=true"
    try:
        response = requests.get(url, headers={"Accept": "application/x-ndjson"}, timeout=30)
    except requests.RequestException as exc:
        print(f"Fehler: Lichess-API nicht erreichbar ({exc}).", file=sys.stderr)
        sys.exit(1)

    if response.status_code == 404:
        print(f"Fehler: Lichess-User '{username}' wurde nicht gefunden.", file=sys.stderr)
        sys.exit(2)
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        print(f"Fehler: Lichess-API-Anfrage fehlgeschlagen ({exc}).", file=sys.stderr)
        sys.exit(1)

    games_json = [line for line in response.text.strip().split("\n") if line]
    if not games_json:
        print(f"Fehler: Fuer '{username}' wurden keine Partien gefunden.", file=sys.stderr)
        sys.exit(3)

    os.makedirs(args.output_dir, exist_ok=True)

    # --- Engine Setup ---
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    client = OpenAI(api_key=openai_api_key)

    all_games_data = []

    for game_idx, game_line in enumerate(games_json, start=1):
        game_data = json.loads(game_line)
        pgn_text = game_data["pgn"]
        game = chess.pgn.read_game(io.StringIO(pgn_text))
        if game is None:
            continue

        board = game.board()
        analysis_data = []

        try:
            white_player = game_data["players"]["white"]["user"]["name"]
        except (KeyError, TypeError):
            white_player = "White"
        try:
            black_player = game_data["players"]["black"]["user"]["name"]
        except (KeyError, TypeError):
            black_player = "Black"

        opponent = black_player if white_player.lower() == username.lower() else white_player
        user_is_white = white_player.lower() == username.lower()
        user_color = "Weiss" if user_is_white else "Schwarz"
        date_iso = None
        created_at = game_data.get("createdAt")
        if created_at:
            from datetime import datetime, timezone
            date_iso = datetime.fromtimestamp(created_at / 1000, tz=timezone.utc).isoformat()

        result = result_for(username, white_player, game_data.get("winner"))

        for ply, move in enumerate(game.mainline_moves(), start=1):
            mover_is_white = board.turn  # True = Weiss ist am Zug (vor dem Push)

            info_before = engine.analyse(board, chess.engine.Limit(depth=args.depth))
            score_before = info_before.get("score")
            eval_before = None
            if score_before:
                try:
                    eval_before = score_before.white().score(mate_score=100000)
                except Exception:
                    pass

            san = board.san(move)
            board.push(move)

            info_after = engine.analyse(board, chess.engine.Limit(depth=args.depth))
            score_after = info_after.get("score")
            eval_after = None
            if score_after:
                try:
                    eval_after = score_after.white().score(mate_score=100000)
                except Exception:
                    pass

            # eval_before/eval_after sind immer aus Weiss-Sicht (Stockfish-Konvention).
            # Fuer Schwarz muss das Delta gespiegelt werden, sonst wird ein guter
            # schwarzer Zug (Vorteil sinkt aus Weiss-Sicht) faelschlich als Blunder gewertet.
            raw_delta = None if eval_before is None or eval_after is None else eval_after - eval_before
            delta = raw_delta if (raw_delta is None or mover_is_white) else -raw_delta

            if mover_is_white == user_is_white:
                # Nur die Zuege von {username} landen in der Analyse, standard
                # Schach-Zugnummerierung (Weiss- und Schwarz-Zug teilen sich eine Nummer).
                analysis_data.append({
                    "move_number": (ply + 1) // 2,
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
            "date": date_iso,
            "result": result,
            "user_color": user_color,
            "moves": analysis_data
        })

    engine.quit()
    print(f"{len(all_games_data)} Partien analysiert.", file=sys.stderr)

    # --- GPT Analyse pro Partie ---
    manifest_games = []

    for game in all_games_data:
        game_number = game["game_number"]
        opponent = game["opponent"]
        user_color = game["user_color"]
        moves_data = game["moves"]

        prompt = f"""
Du bist ein Schachtrainer und analysierst die Partie aus der Perspektive von {username}.
{username} hat in dieser Partie mit {user_color} gespielt.
Die folgenden Zuege sind bereits ausschliesslich die Zuege von {username} (in Spielreihenfolge).
Die "evaluation" jedes Zugs ist bereits korrekt aus der Perspektive von {user_color} berechnet.

Gehe Zug fuer Zug durch und markiere Fehler, Blunder oder sehr gute Zuege (basierend auf Bewertung).
Kleine Ungenauigkeiten werden ignoriert.
Erklaere kurz, warum der Zug ein Fehler/Blunder/Ungenauigkeit ist.
Schlage einen besseren Zug vor, falls noetig.
Wenn der Zug sehr gut war oder theoretisch korrekt ist, markiere dies ebenfalls.
Gib nach der Partie allgemeine Tipps zur Verbesserung.

Antworte AUSSCHLIESSLICH mit validem JSON in folgendem Format (kein Markdown, keine Codefences):
{{
    "game_number": {game_number},
    "opponent": "{opponent}",
    "moves": [
        {{
            "move_number": int,
            "san": str,
            "evaluation": "Sehr guter Zug / Theoretisch korrekt / Blunder / Fehler",
            "kommentar": str,
            "bester_zug": str oder "keiner noetig"
        }},
        ...
    ],
    "tipps": ["Tipp 1", "Tipp 2", ...]
}}

Partie-Zuege:
{json.dumps(moves_data)}
"""

        try:
            gpt_response = client.chat.completions.create(
                model="gpt-5.4-mini",
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            print(f"Fehler: OpenAI-Anfrage fehlgeschlagen ({exc}).", file=sys.stderr)
            sys.exit(4)

        content = ""
        try:
            content = gpt_response.choices[0].message.content.strip()
        except Exception:
            content = ""

        error = None
        try:
            gpt_analysis = extract_json(content)
        except (json.JSONDecodeError, TypeError):
            gpt_analysis = {"moves": [], "tipps": []}
            error = "invalid_gpt_response"

        output_data = {
            "game_number": game_number,
            "opponent": opponent,
            "date": game["date"],
            "result": game["result"],
            "user_color": user_color,
            "moves": gpt_analysis.get("moves", []),
            "tipps": gpt_analysis.get("tipps", []),
        }
        if error:
            output_data["error"] = error
            output_data["raw_gpt_response"] = content

        safe_opponent = opponent.replace(" ", "_").replace("/", "_")
        filename = f"{username}_g{game_number}_vs_{safe_opponent}.json"
        output_path = os.path.join(args.output_dir, filename)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"Analyse Partie {game_number} gegen {opponent} abgeschlossen und gespeichert in: {output_path}", file=sys.stderr)

        manifest_games.append({
            "game_number": game_number,
            "opponent": opponent,
            "date": game["date"],
            "result": game["result"],
            "file": output_path,
            "error": error,
        })

    manifest = {"username": username, "output_dir": args.output_dir, "games": manifest_games}
    print(RESULT_MARKER + json.dumps(manifest))


if __name__ == "__main__":
    main()
