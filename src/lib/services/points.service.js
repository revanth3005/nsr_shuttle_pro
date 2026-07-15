import { readSheet, replaceSheet } from "../excel/store.js";
import { SHEETS, DEFAULT_POINTS_CONFIG } from "../excel/schema.js";

// Points configuration engine — fully configurable from the UI.
export async function getPointsConfig() {
  const rows = await readSheet(SHEETS.Points_Config);
  if (!rows.length) return [...DEFAULT_POINTS_CONFIG];
  return rows.map((r) => ({ ...r, value: Number(r.value || 0) }));
}

export async function getPointsMap() {
  const config = await getPointsConfig();
  const map = {};
  for (const row of config) map[row.key] = Number(row.value || 0);
  return { ...Object.fromEntries(DEFAULT_POINTS_CONFIG.map((d) => [d.key, d.value])), ...map };
}

// Update config values from the UI. `updates` = { key: value, ... }.
export async function updatePointsConfig(updates) {
  return replaceSheet(SHEETS.Points_Config, (current) => {
    const base = current.length ? current : DEFAULT_POINTS_CONFIG.map((d) => ({ ...d }));
    return base.map((row) =>
      row.key in updates ? { ...row, value: Number(updates[row.key]) } : { ...row, value: Number(row.value) }
    );
  });
}

// Award points for a match result: a flat "Match Win" amount for the winner,
// nothing for the loser. Every round (league, Quarter/Semi Final, Final) is
// treated the same — there are no participation points or round bonuses.
// `cfg` (from getPointsMap()) must be provided by the caller.
export function pointsForRound(round, isWinner, cfg) {
  return isWinner ? cfg.matchWin : 0;
}
