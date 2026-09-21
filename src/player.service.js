import { readSheet, findById, insertRow, updateRow, deleteRow, search } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso, pct } from "../utils.js";

export async function listPlayers() {
  return readSheet(SHEETS.Players);
}

export async function getPlayer(id) {
  return findById(SHEETS.Players, id);
}

export async function searchPlayers(term) {
  return search(SHEETS.Players, term, [
    "firstName", "lastName", "email", "city", "state", "club", "skillLevel",
  ]);
}

function normalize(p) {
  const matchesPlayed = Number(p.matchesPlayed || 0);
  const wins = Number(p.wins || 0);
  const losses = Number(p.losses || 0);
  return {
    ...p,
    matchesPlayed,
    wins,
    losses,
    winPercentage: pct(wins, matchesPlayed),
  };
}

export async function listPlayersWithStats() {
  const rows = await listPlayers();
  return rows.map(normalize);
}

export async function getPlayerWithStats(id) {
  const p = await getPlayer(id);
  return p ? normalize(p) : null;
}

// Create a minimal player profile when a Player-role user registers.
export async function createPlayerForUser({ email, name, ...rest }) {
  const [firstName, ...last] = String(name || "").split(" ");
  const player = {
    id: genId("PL"),
    firstName: firstName || name || "Player",
    lastName: last.join(" "),
    gender: rest.gender || "",
    age: rest.age || "",
    mobile: rest.mobile || "",
    email: email || "",
    city: rest.city || "",
    state: rest.state || "",
    club: rest.club || "",
    skillLevel: rest.skillLevel || "Beginner",
    photo: rest.photo || "",
    registrationDate: nowIso(),
    currentPoints: 0,
    currentRanking: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    titlesWon: 0,
  };
  await insertRow(SHEETS.Players, player);
  return player;
}

export async function createPlayer(data) {
  const player = {
    id: genId("PL"),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    gender: data.gender || "",
    age: data.age || "",
    mobile: data.mobile || "",
    email: data.email || "",
    city: data.city || "",
    state: data.state || "",
    club: data.club || "",
    skillLevel: data.skillLevel || "Beginner",
    photo: data.photo || "",
    registrationDate: nowIso(),
    currentPoints: Number(data.currentPoints || 0),
    currentRanking: Number(data.currentRanking || 0),
    matchesPlayed: Number(data.matchesPlayed || 0),
    wins: Number(data.wins || 0),
    losses: Number(data.losses || 0),
    titlesWon: Number(data.titlesWon || 0),
  };
  await insertRow(SHEETS.Players, player);
  return player;
}

export async function updatePlayer(id, patch) {
  return updateRow(SHEETS.Players, id, patch);
}

export async function removePlayer(id) {
  return deleteRow(SHEETS.Players, id);
}
