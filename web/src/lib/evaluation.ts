interface EvaluationStyles {
  bg: string;
  text: string;
}

export function evaluationStyles(evaluation: string): EvaluationStyles {
  const normalized = evaluation.toLowerCase();

  if (normalized.includes("blunder")) {
    return { bg: "bg-red-50", text: "text-red-700" };
  }
  if (normalized.includes("fehler")) {
    return { bg: "bg-orange-50", text: "text-orange-700" };
  }
  if (normalized.includes("sehr guter")) {
    return { bg: "bg-green-50", text: "text-green-700" };
  }
  if (normalized.includes("theoretisch") || normalized.includes("korrekt")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700" };
  }
  return { bg: "bg-white", text: "text-gray-500" };
}

export const RESULT_STYLES: Record<string, string> = {
  Sieg: "bg-green-100 text-green-700",
  Niederlage: "bg-red-100 text-red-700",
  Remis: "bg-gray-200 text-gray-700",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "Datum unbekannt";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
