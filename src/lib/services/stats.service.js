import { readSheet } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { pct } from "../utils.js";
import { matchesForPlayer, didPlayerWin } from "./match.service.js";
import { tournamentsByOrganizer } from "./tournament.service.js";
import { registrationsForTournament } from "./registration.service.js";

// Safe, non-sensitive aggregate counts shown on the public login page — no
// player/personal data, just platform-wide totals.
export async function publicStats() {
  const [tournaments, players, clubs, matches] = await Promise.all([
    readSheet(SHEETS.Tournaments),
    readSheet(SHEETS.Players),
    readSheet(SHEETS.Clubs),
    readSheet(SHEETS.Matches),
  ]);
  return {
    tournamentsConducted: tournaments.filter((t) => t.status === "Completed").length,
    totalPlayers: players.length,
    totalClubs: clubs.length,
    matchesPlayed: matches.filter((m) => m.status === "Completed").length,
  };
}

export async function adminStats() {
  const [players, clubs, tournaments, matches] = await Promise.all([
    readSheet(SHEETS.Players),
    readSheet(SHEETS.Clubs),
    readSheet(SHEETS.Tournaments),
    readSheet(SHEETS.Matches),
  ]);
  const activeTournaments = tournaments.filter(
    (t) => t.status === "Ongoing" || t.status === "Registration Open"
  );
  const matchesPlayed = matches.filter((m) => m.status === "Completed").length;

  return {
    totalPlayers: players.length,
    totalClubs: clubs.length,
    activeTournaments: activeTournaments.length,
    totalTournaments: tournaments.length,
    conductedTournaments: tournaments.filter((t) => t.status === "Completed").length,
    matchesPlayed,
    topPlayers: [...players]
      .sort((a, b) => Number(b.currentPoints || 0) - Number(a.currentPoints || 0))
      .slice(0, 5)
      .map((p) => ({ name: `${p.firstName} ${p.lastName}`.trim(), points: Number(p.currentPoints || 0) })),
    statusBreakdown: ["Draft", "Registration Open", "Ongoing", "Completed"].map((s) => ({
      status: s,
      count: tournaments.filter((t) => t.status === s).length,
    })),
  };
}

export async function organizerStats(organizerId) {
  const mine = await tournamentsByOrganizer(organizerId);
  const ids = new Set(mine.map((t) => t.id));
  const regLists = await Promise.all(mine.map((t) => registrationsForTournament(t.id)));
  const regs = regLists.flat();
  const allMatches = await readSheet(SHEETS.Matches);
  const matches = allMatches.filter((m) => ids.has(m.tournamentId));
  const upcoming = matches.filter((m) => m.status === "Scheduled" || m.status === "Live");

  return {
    managedTournaments: mine.length,
    conductedTournaments: mine.filter((t) => t.status === "Completed").length,
    totalParticipants: regs.length,
    upcomingMatches: upcoming.length,
    totalMatches: matches.length,
    tournaments: mine.slice(0, 6),
    statusBreakdown: ["Draft", "Registration Open", "Ongoing", "Completed"].map((s) => ({
      status: s,
      count: mine.filter((t) => t.status === s).length,
    })),
  };
}

export async function playerStats(playerId) {
  const [players, matches, allRegs] = await Promise.all([
    readSheet(SHEETS.Players),
    matchesForPlayer(playerId),
    readSheet(SHEETS.Registrations),
  ]);
  const p = players.find((x) => String(x.id) === String(playerId));
  const completed = matches.filter((m) => m.status === "Completed");
  const upcoming = matches.filter((m) => m.status === "Scheduled" || m.status === "Live");
  const wins = Number(p?.wins || 0);
  const losses = Number(p?.losses || 0);
  const regs = allRegs.filter((r) => String(r.playerId) === String(playerId));
  const tournamentsPlayed = new Set(regs.map((r) => r.tournamentId)).size;

  const sortedHistory = completed
    .sort((a, b) => String(b.matchDate).localeCompare(String(a.matchDate)))
    .slice(0, 20);
  const matchHistory = await Promise.all(
    sortedHistory.map(async (m) => ({ ...m, won: await didPlayerWin(m, playerId) }))
  );

  return {
    player: p || null,
    currentRanking: Number(p?.currentRanking || 0),
    totalPoints: Number(p?.currentPoints || 0),
    matchesPlayed: Number(p?.matchesPlayed || 0),
    tournamentsPlayed,
    wins,
    losses,
    winRate: pct(wins, wins + losses),
    titlesWon: Number(p?.titlesWon || 0),
    upcomingMatches: upcoming,
    matchHistory,
    performanceTrend: await buildTrend(completed, playerId),
  };
}

async function buildTrend(matches, playerId) {
  // Simple cumulative wins over completed matches for a line chart. Handles
  // both Singles (winnerId is the player) and Doubles (winnerId is their
  // team) via didPlayerWin.
  let cumulative = 0;
  const sorted = matches.sort((a, b) => String(a.matchDate).localeCompare(String(b.matchDate)));
  const trend = [];
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (await didPlayerWin(m, playerId)) cumulative += 1;
    trend.push({ index: i + 1, round: m.round || `#${i + 1}`, wins: cumulative });
  }
  return trend;
}
