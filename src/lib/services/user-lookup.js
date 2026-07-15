import { readSheet } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";

// Small helper split out to avoid circular imports between auth and other
// services. Resolves the User account linked to a Player profile.
export async function getUserForPlayer(playerId) {
  const users = await readSheet(SHEETS.Users);
  return users.find((u) => String(u.playerId) === String(playerId)) || null;
}
