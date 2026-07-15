import { readSheet, findById, insertRow, insertRows, updateRow, deleteRow, filter } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, fullName } from "../utils.js";
import { getPlayer } from "./player.service.js";
import { registrationsForTournament } from "./registration.service.js";

export async function listTeams() {
  return readSheet(SHEETS.Teams);
}

export async function teamsForTournament(tournamentId) {
  const rows = await filter(SHEETS.Teams, (t) => String(t.tournamentId) === String(tournamentId));
  return Promise.all(rows.map(decorateTeam));
}

export async function getTeam(id) {
  return findById(SHEETS.Teams, id);
}

// Enrich a team with resolved player names for display.
export async function decorateTeam(team) {
  if (!team) return null;
  const [p1, p2] = await Promise.all([getPlayer(team.player1Id), getPlayer(team.player2Id)]);
  return {
    ...team,
    player1Name: fullName(p1),
    player2Name: fullName(p2),
  };
}

export async function listTeamsWithNames() {
  const rows = await listTeams();
  return Promise.all(rows.map(decorateTeam));
}

export async function createTeam(data) {
  const [p1, p2] = await Promise.all([getPlayer(data.player1Id), getPlayer(data.player2Id)]);
  const name = data.name || `${fullName(p1)} / ${fullName(p2)}`;
  const team = {
    id: genId("TM"),
    name,
    player1Id: data.player1Id || "",
    player2Id: data.player2Id || "",
    tournamentId: data.tournamentId || "",
    points: Number(data.points || 0),
    ranking: Number(data.ranking || 0),
  };
  await insertRow(SHEETS.Teams, team);
  return team;
}

export async function updateTeam(id, patch) {
  return updateRow(SHEETS.Teams, id, patch);
}

export async function removeTeam(id) {
  return deleteRow(SHEETS.Teams, id);
}

// Fisher–Yates shuffle. Uses Math.random so each "Generate Teams Randomly"
// produces a genuinely different pairing.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Randomly pair the tournament's participant players into doubles teams.
// Replaces any existing teams for the tournament. An odd player is left unpaired.
export async function generateRandomTeams(tournamentId) {
  const regs = await registrationsForTournament(tournamentId);
  const playerIds = regs.filter((r) => r.playerId).map((r) => r.playerId);

  if (playerIds.length < 2) {
    const err = new Error("Add at least 2 players to the tournament before generating teams");
    err.status = 400;
    throw err;
  }

  // Clear existing teams for this tournament first.
  const existing = await filter(SHEETS.Teams, (t) => String(t.tournamentId) === String(tournamentId));
  for (const t of existing) await deleteRow(SHEETS.Teams, t.id);

  const shuffled = shuffle(playerIds);
  const teams = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const [p1, p2] = await Promise.all([getPlayer(shuffled[i]), getPlayer(shuffled[i + 1])]);
    teams.push({
      id: genId("TM"),
      name: `${fullName(p1)} / ${fullName(p2)}`,
      player1Id: shuffled[i],
      player2Id: shuffled[i + 1],
      tournamentId,
      points: 0,
      ranking: 0,
    });
  }
  if (teams.length) await insertRows(SHEETS.Teams, teams);
  return { teams, unpaired: shuffled.length % 2 === 1 };
}
