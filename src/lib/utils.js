import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const COLOR_PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

export function getColorForName(name) {
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}
