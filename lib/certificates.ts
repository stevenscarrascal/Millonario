export const GAME_LEVELS = [
  "INTERMEDIO",
  "AVANZADO",
  "ESPECIALISTA",
  "EXPERTO",
  "EXPERTO INTERNACIONAL",
] as const;

export type GameLevel = typeof GAME_LEVELS[number];

export function isCertificateEligible(level: string | null | undefined): boolean {
  if (!level) return false;
  return (GAME_LEVELS as readonly string[]).includes(level) && level !== "INTERMEDIO";
}
