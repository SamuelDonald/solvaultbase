import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address?: string | null, size = 4) {
  if (!address) return "";
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}

export function formatSol(value: number): string {
  return `${value.toFixed(2)} SOL`;
}
