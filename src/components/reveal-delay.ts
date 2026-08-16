export type RevealDelay = 0 | 1 | 2 | 3 | 4;

export function revealDelay(n: number): RevealDelay {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}
