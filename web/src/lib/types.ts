export type GameResult = "Sieg" | "Niederlage" | "Remis";
export type UserColor = "Weiss" | "Schwarz";

export interface AnalyzedMove {
  move_number: number;
  san: string;
  evaluation: string;
  kommentar: string;
  bester_zug: string;
}

export interface GameAnalysis {
  game_number: number;
  opponent: string;
  date: string | null;
  result: GameResult;
  user_color: UserColor;
  moves: AnalyzedMove[];
  tipps: string[];
  error?: string;
  raw_gpt_response?: string;
}

export interface AnalyzeResponse {
  username: string;
  games: GameAnalysis[];
}

export interface AnalyzeErrorResponse {
  error: string;
}
