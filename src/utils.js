import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Short human-friendly ids with a type prefix, e.g. "PL-1a2b3c".
export function genId(prefix = "ID") {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fullName(player) {
  if (!player) return "";
  return `${player.firstName || ""} ${player.lastName || ""}`.trim();
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
