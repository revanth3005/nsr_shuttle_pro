import { readSheet, writeSheet, replaceSheet } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, nowIso, pct, fullName } from "../utils.js";
import { getPointsMap, pointsForRound } from "./points.service.js";

// ---------------------------------------------------------------------------
// Ranking engine.
// Composite ranking score = tournament points (primary) blended with
// win-percentage, titles won and recent performance. Recomputed whenever a
// match result is entered.
// ---------------------------------------------------------------------------

function isFinalRound(round) {
  const r = String(round || "").toLowerCase();
  return r.includes("final") && !r.includes("semi");
}

// Rebuild every player's matchesPlayed/wins/losses/currentPoints/titlesWon
// from scratch by replaying every completed (or walkover) match in the
// Matches sheet — the single source of truth. This is a full REPLACE, not an
// incremental add/subtract, so it can never drift out of sync no matter how
// many times a result is edited, a match is deleted, or fixtures are
// regenerated. Works identically for Singles and Doubles (a team's win/loss
// credits both members) and for every tournament format.
//
// Players and Teams are fetched ONCE up front (2 queries) instead of once per
// match — over a network database, resolving each match's winner/loser one
// row at a time turns a handful of matches into dozens of round trips.
async function computePlayerStatsFromMatches() {
  const [allMatches, allPlayers, allTeams, cfg] = await Promise.all([
    readSheet(SHEETS.Matches),
    readSheet(SHEETS.Players),
    readSheet(SHEETS.Teams),
    getPointsMap(),
  ]);
  const matches = allMatches.filter(
    (m) => (m.status === "Completed" || m.status === "Walkover") && m.winnerId
  );
  const playerIds = new Set(allPlayers.map((p) => p.id));
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  // Resolve a match "side" id to the individual player id(s) behind it — the
  // player themself for Singles, or BOTH members for a Doubles team. Purely
  // in-memory now (no DB calls) using the lookups fetched above.
  const resolvePlayerIds = (sideId) => {
    if (!sideId) return [];
    if (playerIds.has(sideId)) return [sideId];
    const team = teamById.get(sideId);
    if (team) return [team.player1Id, team.player2Id].filter(Boolean);
    return [];
  };

  const stats = {};
  const ensure = (id) => (stats[id] = stats[id] || { matchesPlayed: 0, wins: 0, losses: 0, points: 0, titles: 0 });

  for (const m of matches) {
    const final = isFinalRound(m.round);
    const winnerIds = resolvePlayerIds(m.winnerId);
    const loserIds = resolvePlayerIds(m.loserId);
    for (const pid of winnerIds) {
      const s = ensure(pid);
      s.matchesPlayed++;
      s.wins++;
      s.points += pointsForRound(m.round, true, cfg);
      if (final) s.titles++;
    }
    for (const pid of loserIds) {
      const s = ensure(pid);
      s.matchesPlayed++;
      s.losses++;
      s.points += pointsForRound(m.round, false, cfg);
    }
  }
  return stats;
}

// Returns the freshly-updated player rows so callers can reuse them directly
// instead of reading the Players table again right after writing it.
async function syncPlayerStats() {
  const stats = await computePlayerStatsFromMatches();
  return replaceSheet(SHEETS.Players, (players) =>
    players.map((p) => {
      const s = stats[p.id];
      return {
        ...p,
        matchesPlayed: s ? s.matchesPlayed : 0,
        wins: s ? s.wins : 0,
        losses: s ? s.losses : 0,
        currentPoints: s ? s.points : 0,
        titlesWon: s ? s.titles : 0,
      };
    })
  );
}

function rankingScore(p) {
  const points = Number(p.currentPoints || 0);
  const winPct = pct(Number(p.wins || 0), Number(p.matchesPlayed || 0));
  const titles = Number(p.titlesWon || 0);
  // Weighted composite. Points dominate; win% and titles are tie-breaker boosts.
  return points + winPct * 0.5 + titles * 15;
}

function rankGroup(players) {
  return [...players]
    .sort((a, b) => rankingScore(b) - rankingScore(a))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// Resync every player's stats from the match log, then rebuild the Rankings
// sheet from those fresh stats across all scopes (Overall/State/Club/Yearly).
export async function recalculateRankings() {
  // syncPlayerStats already returns the freshly-written rows — reuse them
  // directly instead of reading the Players table a second time.
  const players = await syncPlayerStats();
  const year = new Date().getFullYear();
  const rows = [];

  const build = (scope, scopeValue, list) => {
    rankGroup(list).forEach((p) => {
      rows.push({
        id: genId("RNK"),
        scope,
        scopeValue: scopeValue || "",
        playerId: p.id,
        playerName: fullName(p),
        club: p.club || "",
        state: p.state || "",
        points: Number(p.currentPoints || 0),
        matchesPlayed: Number(p.matchesPlayed || 0),
        wins: Number(p.wins || 0),
        winPercentage: pct(Number(p.wins || 0), Number(p.matchesPlayed || 0)),
        titlesWon: Number(p.titlesWon || 0),
        rank: p.rank,
        year,
        updatedAt: nowIso(),
      });
    });
  };

  // Overall
  build("Overall", "All", players);

  // Per state
  const byState = {};
  for (const p of players) {
    const s = p.state || "Unknown";
    (byState[s] = byState[s] || []).push(p);
  }
  Object.entries(byState).forEach(([s, list]) => build("State", s, list));

  // Per club
  const byClub = {};
  for (const p of players) {
    const c = p.club || "Independent";
    (byClub[c] = byClub[c] || []).push(p);
  }
  Object.entries(byClub).forEach(([c, list]) => build("Club", c, list));

  // Yearly (current year snapshot mirrors overall)
  build("Yearly", String(year), players);

  // Direct writes (not replaceSheet) — we already have the full row set in
  // memory, so there's no need to read the table again just to discard it.
  await writeSheet(SHEETS.Rankings, rows);

  // Also write each player's overall rank back onto the Players sheet.
  const overall = rankGroup(players);
  const rankById = Object.fromEntries(overall.map((p) => [p.id, p.rank]));
  const withRank = players.map((p) => ({ ...p, currentRanking: rankById[p.id] ?? p.currentRanking ?? 0 }));
  await writeSheet(SHEETS.Players, withRank);

  return rows;
}

export async function getRankings(scope = "Overall", scopeValue) {
  const rows = await readSheet(SHEETS.Rankings);
  return rows
    .filter((r) => r.scope === scope && (scopeValue ? String(r.scopeValue) === String(scopeValue) : true))
    .sort((a, b) => Number(a.rank) - Number(b.rank));
}

export async function overallLeaderboard() {
  const list = await getRankings("Overall", "All");
  if (list.length) return list;
  // Fallback: derive from players if rankings not yet computed.
  const players = await readSheet(SHEETS.Players);
  return rankGroup(players).map((p) => ({
    playerId: p.id,
    playerName: fullName(p),
    club: p.club,
    state: p.state,
    points: Number(p.currentPoints || 0),
    matchesPlayed: Number(p.matchesPlayed || 0),
    wins: Number(p.wins || 0),
    winPercentage: pct(Number(p.wins || 0), Number(p.matchesPlayed || 0)),
    rank: p.rank,
  }));
}
