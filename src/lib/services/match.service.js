import { readSheet, findById, insertRow, updateRow, deleteRow, filter } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, fullName } from "../utils.js";
import { recalculateRankings } from "./ranking.service.js";
import { getPlayer } from "./player.service.js";
import { getTeam } from "./team.service.js";
import { notify } from "./notification.service.js";
import { getUserForPlayer } from "./user-lookup.js";

// Resolve a side id (player or team) to a display name.
async function resolveSideName(id) {
  if (!id) return "";
  const p = await getPlayer(id);
  if (p) return fullName(p);
  const t = await getTeam(id);
  if (t) return t.name;
  return String(id);
}

// Resolve a match "side" id to the individual player id(s) — the player
// themself for Singles, or both members for a Doubles team. Used here only
// for notifications; player STATS are derived separately and authoritatively
// by ranking.service's recalculateRankings (see that file for why).
async function resolvePlayerIds(sideId) {
  if (!sideId) return [];
  if (await getPlayer(sideId)) return [sideId];
  const team = await getTeam(sideId);
  if (team) return [team.player1Id, team.player2Id].filter(Boolean);
  return [];
}

export async function listMatches() {
  return readSheet(SHEETS.Matches);
}

export async function matchesForTournament(tournamentId) {
  return filter(SHEETS.Matches, (m) => String(m.tournamentId) === String(tournamentId));
}

export async function getMatch(id) {
  return findById(SHEETS.Matches, id);
}

// Matches involving a given player — either directly (Singles, side id is the
// player) or via their doubles team (side id is the team, so we check team
// membership too). Teams are fetched ONCE (1 query) instead of once per
// match per side — this runs on every player dashboard load.
export async function matchesForPlayer(playerId) {
  const [all, teams] = await Promise.all([listMatches(), readSheet(SHEETS.Teams)]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const onTeam = (teamId) => {
    const t = teamById.get(teamId);
    return !!t && (String(t.player1Id) === String(playerId) || String(t.player2Id) === String(playerId));
  };
  return all.filter((m) =>
    String(m.side1Id) === String(playerId) ||
    String(m.side2Id) === String(playerId) ||
    onTeam(m.side1Id) ||
    onTeam(m.side2Id)
  );
}

export async function createMatch(data) {
  const [side1Name, side2Name] = await Promise.all([
    data.side1Name ? data.side1Name : resolveSideName(data.side1Id),
    data.side2Name ? data.side2Name : resolveSideName(data.side2Id),
  ]);
  const match = {
    id: genId("MTC"),
    tournamentId: data.tournamentId || "",
    round: data.round || "Round 1",
    court: data.court || "",
    matchDate: data.matchDate || "",
    matchTime: data.matchTime || "",
    side1Id: data.side1Id || "",
    side2Id: data.side2Id || "",
    side1Name,
    side2Name,
    set1: data.set1 || "",
    set2: data.set2 || "",
    set3: data.set3 || "",
    winnerId: "",
    loserId: "",
    duration: data.duration || "",
    status: data.status || "Scheduled",
  };
  await insertRow(SHEETS.Matches, match);
  return match;
}

export async function updateMatch(id, patch) {
  const next = { ...patch };
  // Keep display names in sync whenever a side id is changed (e.g. editing a
  // match's players/teams from the UI).
  if ("side1Id" in next) next.side1Name = await resolveSideName(next.side1Id);
  if ("side2Id" in next) next.side2Name = await resolveSideName(next.side2Id);
  const updated = await updateRow(SHEETS.Matches, id, next);
  // A metadata edit (e.g. changing the round name) can change how a completed
  // match's points are classified, so always resync — cheap and never wrong.
  await recalculateRankings();
  return updated;
}

// Determine the winner from best-of-3 set scores like "21-18".
function decideWinner(match) {
  const sets = [match.set1, match.set2, match.set3];
  let s1 = 0;
  let s2 = 0;
  for (const set of sets) {
    if (!set || typeof set !== "string" || !set.includes("-")) continue;
    const [a, b] = set.split("-").map((x) => Number(x.trim()));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a > b) s1 += 1;
      else if (b > a) s2 += 1;
    }
  }
  if (s1 === 0 && s2 === 0) return null;
  return s1 > s2 ? "side1" : "side2";
}

async function notifyResult(playerId, title, message) {
  const user = await getUserForPlayer(playerId);
  if (user) await notify(user.id, "Match Result Published", title, message);
}

// Delete a match, then resync every player's stats/rankings from what's left
// in the Matches sheet — so deleting a scored match (or a bye/walkover) never
// leaves stale points behind, for any tournament type.
export async function removeMatch(id) {
  const match = await findById(SHEETS.Matches, id);
  if (!match) return false;
  const removed = await deleteRow(SHEETS.Matches, id);
  await recalculateRankings();
  return removed;
}

// Record (or edit) a result and resync rankings. Player stats are never
// incrementally patched here — recalculateRankings() always fully recomputes
// every player's matchesPlayed/wins/losses/points/titles by replaying the
// entire Matches sheet, so editing a completed match's score, or re-scoring
// it differently, can never double-count or drift.
export async function recordResult(id, { set1, set2, set3, status, duration, court, matchDate, matchTime }) {
  const match = await findById(SHEETS.Matches, id);
  if (!match) {
    const err = new Error("Match not found");
    err.status = 404;
    throw err;
  }

  const patch = {};
  if (set1 !== undefined) patch.set1 = set1;
  if (set2 !== undefined) patch.set2 = set2;
  if (set3 !== undefined) patch.set3 = set3;
  if (duration !== undefined) patch.duration = duration;
  if (court !== undefined) patch.court = court;
  if (matchDate !== undefined) patch.matchDate = matchDate;
  if (matchTime !== undefined) patch.matchTime = matchTime;

  const merged = { ...match, ...patch };
  const result = decideWinner(merged);
  const finalStatus = status || (result ? "Completed" : match.status);
  patch.status = finalStatus;

  if (result && finalStatus === "Completed") {
    patch.winnerId = result === "side1" ? match.side1Id : match.side2Id;
    patch.loserId = result === "side1" ? match.side2Id : match.side1Id;
  } else {
    // No decisive result (yet) — make sure no stale winner/loser lingers.
    patch.winnerId = "";
    patch.loserId = "";
  }

  await updateRow(SHEETS.Matches, id, patch);
  await recalculateRankings();

  if (patch.winnerId) {
    const winnerPlayers = await resolvePlayerIds(patch.winnerId);
    const loserPlayers = await resolvePlayerIds(patch.loserId);

    for (const pid of winnerPlayers) {
      await notifyResult(pid, "You won your match!", `Result: ${merged.set1 || ""} ${merged.set2 || ""} ${merged.set3 || ""}`.trim());
    }
    for (const pid of loserPlayers) {
      await notifyResult(pid, "Match result published", `Result recorded for your ${match.round} match.`);
    }

    // Auto-advance the league playoff (Qualifier 1 -> Semi Final -> Final) or
    // the knockout bracket (winner into the next round's placeholder) as
    // results come in. Dynamic imports avoid a circular dependency (both
    // modules import from this file). Never let this break saving the result.
    try {
      const { advancePlayoffs } = await import("./playoff.service.js");
      await advancePlayoffs(match.tournamentId);
    } catch (e) {
      console.error("[PLAYOFF] advance failed", e.message);
    }
    try {
      const { advanceKnockout } = await import("./fixture.service.js");
      await advanceKnockout(match.tournamentId);
    } catch (e) {
      console.error("[KNOCKOUT] advance failed", e.message);
    }
  }

  return findById(SHEETS.Matches, id);
}
