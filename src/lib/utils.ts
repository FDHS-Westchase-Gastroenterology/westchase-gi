import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- clsx ClassValue is a recursive framework type that cannot be made readonly
export function cn(...inputs: readonly ClassValue[]): string {
  return twMerge(clsx(inputs));
}
