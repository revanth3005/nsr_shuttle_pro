import { where } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";

// Small helper split out to avoid circular imports between auth and other
// services. Resolves the User account linked to a Player profile.
// Matched in SQL — this runs once per player on every published result, and
// used to pull the entire Users table across the wire each time.
export async function getUserForPlayer(playerId) {
  if (!playerId) return null;
  const rows = await where(SHEETS.Users, { playerId });
  return rows[0] || null;
}
