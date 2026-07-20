// Playoff engine — Page playoff system on top of a round-robin league.
//
//   1. League: everyone plays everyone (rounds named "Round N").
//   2. Qualifier 1 : standings #1 vs #2  -> winner goes to the Final.
//   3. Semi Final  : loser(Qualifier 1) vs #3 -> winner advances.
//   4. Final       : winner(Qualifier 1) vs winner(Semi Final).
//
// Stages are created one at a time as results come in (advancePlayoffs is
// idempotent and only creates the next stage that is possible).

import { readSheet } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { getTournament } from "./tournament.service.js";
import { createMatch, updateMatch, matchesForTournament } from "./match.service.js";
import { getPlayer } from "./player.service.js";
import { getTeam } from "./team.service.js";
import { fullName } from "../utils.js";

const LEAGUE_RE = /^round\s/i; // "Round 1", "Round 2", ...
const isLeagueMatch = (m) => LEAGUE_RE.test(String(m.round || ""));

const PLAYOFF_ROUNDS = ["Qualifier 1", "Semi Final", "Final"];

async function sideName(id) {
  const p = await getPlayer(id);
  if (p) return fullName(p);
  const t = await getTeam(id);
  if (t) return t.name;
  return String(id || "");
}

// Build in-memory lookup maps for every player/team once, so resolving names
// for many sides doesn't cost one DB round trip per side. Returns sync
// getPlayer/getTeam-shaped functions that read from these maps.
async function buildLookup() {
  const [players, teams] = await Promise.all([readSheet(SHEETS.Players), readSheet(SHEETS.Teams)]);
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return {
    getPlayer: (id) => playerById.get(id) || null,
    getTeam: (id) => teamById.get(id) || null,
    sideName: (id) => {
      const p = playerById.get(id);
      if (p) return fullName(p);
      const t = teamById.get(id);
      if (t) return t.name;
      return String(id || "");
    },
  };
}

function tallySets(m) {
  let a = 0, b = 0, pf = 0, pa = 0;
  for (const s of [m.set1, m.set2, m.set3]) {
    if (!s || typeof s !== "string" || !s.includes("-")) continue;
    const [x, y] = s.split("-").map((n) => Number(n.trim()));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      if (x > y) a++; else if (y > x) b++;
      pf += x; pa += y;
    }
  }
  return { a, b, pf, pa };
}

// Net Points Rate — the badminton equivalent of cricket's Net Run Rate:
//   NPR = (points scored − points conceded) ÷ sets played
// A RATE rather than a raw sum, so it stays comparable even when two teams
// haven't played the exact same number of sets. Blank (null) until a team
// has actually played at least one set — never divides by zero.
function netPointsRate(r) {
  if (!r.setsPlayed) return null;
  return Math.round(((r.pointsFor - r.pointsAgainst) / r.setsPlayed) * 100) / 100;
}

// Standings table for a tournament. Rank is determined by LEAGUE performance
// only (this is what seeds the playoffs — #1 vs #2, etc. — and must never
// shift once Qualifier 1/Semi/Final are underway). The displayed
// Played/Wins/Losses/Set +-/Points, however, include the playoff matches a
// team went on to play, so the table reflects their full run through the
// tournament, not just the round-robin stage.
export async function leagueStandings(tournamentId) {
  const [all, lookup] = await Promise.all([matchesForTournament(tournamentId), buildLookup()]);
  const table = {};
  const ensure = (id) => {
    if (!table[id]) {
      table[id] = {
        id, name: lookup.sideName(id), played: 0, wins: 0, losses: 0,
        setDiff: 0, pointDiff: 0, points: 0,
        pointsFor: 0, pointsAgainst: 0, setsPlayed: 0,
      };
    }
    return table[id];
  };

  const tally = (m) => {
    if (m.status !== "Completed") return;
    if (!m.side1Id || !m.side2Id) return;
    const s1 = ensure(m.side1Id);
    const s2 = ensure(m.side2Id);
    const { a, b, pf, pa } = tallySets(m);
    s1.played++; s2.played++;
    s1.setDiff += a - b; s2.setDiff += b - a;
    s1.pointDiff += pf - pa; s2.pointDiff += pa - pf;
    s1.pointsFor += pf; s1.pointsAgainst += pa;
    s2.pointsFor += pa; s2.pointsAgainst += pf;
    s1.setsPlayed += a + b; s2.setsPlayed += a + b;
    if (String(m.winnerId) === String(m.side1Id)) { s1.wins++; s2.losses++; }
    else if (String(m.winnerId) === String(m.side2Id)) { s2.wins++; s1.losses++; }
  };

  all.filter(isLeagueMatch).forEach(tally);

  // Freeze the rank from league performance only. Net Points Rate is the
  // final tiebreaker — only ever consulted if wins, set diff AND point diff
  // are all still tied.
  const rankById = Object.fromEntries(
    Object.values(table)
      .sort((x, y) =>
        y.wins - x.wins ||
        y.setDiff - x.setDiff ||
        y.pointDiff - x.pointDiff ||
        (netPointsRate(y) ?? -Infinity) - (netPointsRate(x) ?? -Infinity)
      )
      .map((r, i) => [r.id, i + 1])
  );

  // Now fold in the playoff matches — same accumulators, so Played/W/L/Pts
  // become the team's full total while the rank order stays as league-set.
  all.filter((m) => PLAYOFF_ROUNDS.includes(String(m.round))).forEach(tally);

  return Object.values(table)
    .map((r) => ({ ...r, points: r.wins * 2, rank: rankById[r.id] ?? 999, netPointsRate: netPointsRate(r) }))
    .sort((a, b) => a.rank - b.rank);
}

export async function leagueComplete(tournamentId) {
  const all = await matchesForTournament(tournamentId);
  const league = all.filter(isLeagueMatch);
  return league.length > 0 && league.every((m) => m.status === "Completed");
}

export async function playoffState(tournamentId) {
  const all = await matchesForTournament(tournamentId);
  const [standings, complete] = await Promise.all([
    leagueStandings(tournamentId),
    leagueComplete(tournamentId),
  ]);
  return {
    standings,
    leagueComplete: complete,
    hasPlayoffs: all.some((m) => PLAYOFF_ROUNDS.includes(String(m.round))),
  };
}

// Make sure a playoff stage's match row exists (creating a TBD placeholder if
// one wasn't already generated up front — a safety net for older data).
async function ensureStage(tournamentId, all, round) {
  const existing = all.find((m) => String(m.round) === round);
  if (existing) return existing;
  return createMatch({
    tournamentId, round, court: "Court 1",
    side1Id: "", side2Id: "", side1Name: "TBD", side2Name: "TBD", status: "Scheduled",
  });
}

// Fill exactly one side of a stage — leaving the other side (still TBD or
// already filled) untouched. This is what lets "Semi Final: #3" or "Final:
// Qualifier 1 winner" appear the moment THAT piece is known, instead of
// waiting until both sides of the stage are decided.
async function fillSide(match, sideNum, id) {
  if (!match || !id) return false;
  const idKey = sideNum === 1 ? "side1Id" : "side2Id";
  if (match[idKey]) return false; // already filled — no-op
  const nameKey = sideNum === 1 ? "side1Name" : "side2Name";
  const name = await sideName(id);
  await updateMatch(match.id, { [idKey]: id, [nameKey]: name });
  match[idKey] = id; // keep the in-memory copy in sync for this pass
  return true;
}

// Fill in every playoff slot that's currently determinable. Each side of each
// stage fills in independently and as soon as it's known — the Semi Final's
// #3 seed appears the moment the league finishes (it doesn't wait for
// Qualifier 1 to be played), and the Qualifier 1 winner appears in the Final
// the moment Qualifier 1 finishes (it doesn't wait for the Semi Final).
// Idempotent and safe to call after every result.
export async function advancePlayoffs(tournamentId) {
  const t = await getTournament(tournamentId);
  if (!t) return { stage: "none", advanced: 0 };
  // Pure knockout tournaments already are a bracket — no league playoffs.
  if (String(t.format) === "Knockout") return { stage: "knockout", advanced: 0 };

  const allMatches = await matchesForTournament(tournamentId);
  const league = allMatches.filter(isLeagueMatch);
  if (!league.length) return { stage: "none", advanced: 0 };
  if (!league.every((m) => m.status === "Completed")) {
    return { stage: "league", advanced: 0, message: "League matches are still in progress" };
  }

  const standings = await leagueStandings(tournamentId);
  if (standings.length < 2) return { stage: "league", advanced: 0 };

  const all = await matchesForTournament(tournamentId);
  const touched = new Set();
  let advanced = 0;
  const mark = (round, did) => { if (did) { advanced++; touched.add(round); } };

  if (standings.length === 2) {
    // Only two participants — a single Final, no Qualifier/Semi stage.
    const final = await ensureStage(tournamentId, all, "Final");
    mark("Final", await fillSide(final, 1, standings[0].id));
    mark("Final", await fillSide(final, 2, standings[1].id));
  } else {
    const q1 = await ensureStage(tournamentId, all, "Qualifier 1");
    const semi = await ensureStage(tournamentId, all, "Semi Final");
    const final = await ensureStage(tournamentId, all, "Final");

    // Qualifier 1: #1 vs #2 — both known the instant the league finishes.
    mark("Qualifier 1", await fillSide(q1, 1, standings[0].id));
    mark("Qualifier 1", await fillSide(q1, 2, standings[1].id));

    // Semi Final: #3 is known immediately; the Qualifier 1 loser only once
    // Qualifier 1 is decided.
    mark("Semi Final", await fillSide(semi, 2, standings[2].id));
    if (q1.status === "Completed" && q1.winnerId) {
      mark("Semi Final", await fillSide(semi, 1, q1.loserId));
      mark("Final", await fillSide(final, 1, q1.winnerId));
    }

    // Final: the Semi Final winner, once the Semi Final is decided.
    if (semi.status === "Completed" && semi.winnerId) {
      mark("Final", await fillSide(final, 2, semi.winnerId));
    }
  }

  return { stage: touched.size ? [...touched].join(", ") : "none", advanced };
}
