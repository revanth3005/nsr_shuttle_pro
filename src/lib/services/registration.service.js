import { readSheet, insertRow, deleteRow, filter } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso, fullName } from "../utils.js";
import { getPlayer } from "./player.service.js";
import { getTeam } from "./team.service.js";
import { getTournament } from "./tournament.service.js";

// Participants are added directly to a tournament — no approval workflow.
// (The sheet is still called Registrations; every row is an active participant.)

export async function listRegistrations() {
  return readSheet(SHEETS.Registrations);
}

export async function registrationsForTournament(tournamentId) {
  return filter(SHEETS.Registrations, (r) => String(r.tournamentId) === String(tournamentId));
}

export async function decorateRegistration(r) {
  const [t, player, team] = await Promise.all([
    getTournament(r.tournamentId),
    r.playerId ? getPlayer(r.playerId) : null,
    r.teamId ? getTeam(r.teamId) : null,
  ]);
  return {
    ...r,
    tournamentName: t?.name || "",
    participant: team ? team.name : fullName(player),
  };
}

export async function listRegistrationsDecorated() {
  const rows = await listRegistrations();
  return Promise.all(rows.map(decorateRegistration));
}

// Player ids already added to a tournament (used to avoid duplicates + to build teams).
export async function participantPlayerIds(tournamentId) {
  const rows = await registrationsForTournament(tournamentId);
  return rows.filter((r) => r.playerId).map((r) => String(r.playerId));
}

export async function register(data) {
  // Prevent adding the same player to the same tournament twice.
  if (data.playerId) {
    const existing = await participantPlayerIds(data.tournamentId);
    if (existing.includes(String(data.playerId))) {
      const err = new Error("This player is already added to the tournament");
      err.status = 409;
      throw err;
    }
  }
  const reg = {
    id: genId("REG"),
    tournamentId: data.tournamentId,
    playerId: data.playerId || "",
    teamId: data.teamId || "",
    type: data.type || (data.teamId ? "Doubles" : "Singles"),
    status: "Active",
    registeredAt: nowIso(),
  };
  await insertRow(SHEETS.Registrations, reg);
  return reg;
}

export async function removeRegistration(id) {
  return deleteRow(SHEETS.Registrations, id);
}

// Participants for the fixture engine. For doubles tournaments the sides are the
// teams created for the tournament; otherwise they are the individual players.
export async function fixtureParticipants(tournamentId) {
  const t = await getTournament(tournamentId);
  const isDoubles = String(t?.category || "").toLowerCase().includes("doubles");

  if (isDoubles) {
    const teams = await filter(SHEETS.Teams, (tm) => String(tm.tournamentId) === String(tournamentId));
    return teams.map((tm) => ({ id: tm.id, isTeam: true }));
  }

  const rows = await registrationsForTournament(tournamentId);
  return rows.filter((r) => r.playerId).map((r) => ({ id: r.playerId, isTeam: false }));
}
