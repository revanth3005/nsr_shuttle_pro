import { readSheet, findById, insertRow, updateRow, deleteRow, search } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, pct } from "../utils.js";

export async function listClubs() {
  return readSheet(SHEETS.Clubs);
}

export async function getClub(id) {
  return findById(SHEETS.Clubs, id);
}

export async function searchClubs(term) {
  return search(SHEETS.Clubs, term, ["name", "city", "state", "contactPerson"]);
}

export async function createClub(data) {
  const club = {
    id: genId("CLB"),
    name: data.name || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    contactPerson: data.contactPerson || "",
    contactNumber: data.contactNumber || "",
    members: Number(data.members || 0),
  };
  await insertRow(SHEETS.Clubs, club);
  return club;
}

export async function updateClub(id, patch) {
  return updateRow(SHEETS.Clubs, id, patch);
}

export async function removeClub(id) {
  return deleteRow(SHEETS.Clubs, id);
}

// Club leaderboard: aggregate player points and wins per club name.
export async function clubLeaderboard() {
  const players = await readSheet(SHEETS.Players);
  const byClub = {};
  for (const p of players) {
    const club = p.club || "Independent";
    if (!byClub[club]) {
      byClub[club] = { club, players: 0, points: 0, wins: 0, matchesPlayed: 0, titlesWon: 0 };
    }
    const g = byClub[club];
    g.players += 1;
    g.points += Number(p.currentPoints || 0);
    g.wins += Number(p.wins || 0);
    g.matchesPlayed += Number(p.matchesPlayed || 0);
    g.titlesWon += Number(p.titlesWon || 0);
  }
  return Object.values(byClub)
    .map((g) => ({ ...g, winPercentage: pct(g.wins, g.matchesPlayed) }))
    .sort((a, b) => b.points - a.points)
    .map((g, i) => ({ ...g, rank: i + 1 }));
}
