import { AsyncLocalStorage } from "node:async_hooks";
import { readSheet, writeSheet } from "../excel/store.js";
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
  // allPlayers was already fetched above — hand it back so the caller doesn't
  // pay for a second read of the same table.
  return { stats, players: allPlayers };
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

// Recomputing rankings replays the entire Matches table and rewrites both the
// Players and Rankings tables — by far the most expensive thing the app does.
// A single "record result" request used to trigger it several times over
// (recordResult itself, then again from every updateMatch the playoff engine
// made while filling in the next round). Against a network database that is
// seconds of pure waiting.
//
// withDeferredRankings() collapses all of that into ONE recompute at the end
// of the request. AsyncLocalStorage scopes the flag to the current async
// context, so two requests running concurrently can never defer each other's
// work — a plain module-level flag would let request A swallow request B's
// recalculation and leave B's results unranked.
const deferStore = new AsyncLocalStorage();

export async function withDeferredRankings(fn) {
  const store = { dirty: false };
  const result = await deferStore.run(store, fn);
  if (store.dirty) await runRecalculateRankings();
  return result;
}

export async function recalculateRankings() {
  const store = deferStore.getStore();
  if (store) {
    store.dirty = true; // someone up the stack will run it once, at the end
    return null;
  }
  return runRecalculateRankings();
}

// Resync every player's stats from the match log, then rebuild the Rankings
// sheet from those fresh stats across all scopes (Overall/State/Club/Yearly).
async function runRecalculateRankings() {
  // One pass over the match log gives both the stats and the Players rows.
  const { stats, players: current } = await computePlayerStatsFromMatches();
  const players = current.map((p) => {
    const st = stats[p.id];
    return {
      ...p,
      matchesPlayed: st ? st.matchesPlayed : 0,
      wins: st ? st.wins : 0,
      losses: st ? st.losses : 0,
      currentPoints: st ? st.points : 0,
      titlesWon: st ? st.titles : 0,
    };
  });
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

  // Players is written ONCE, with stats and overall rank together. It used to
  // be fully deleted and re-inserted twice per recompute — once for the stats
  // and again for the rank — which on a network database doubled the cost of
  // the single most expensive write in the app for no reason.
  const overall = rankGroup(players);
  const rankById = Object.fromEntries(overall.map((p) => [p.id, p.rank]));
  const withRank = players.map((p) => ({ ...p, currentRanking: rankById[p.id] ?? p.currentRanking ?? 0 }));

  // Independent tables, so both writes can go out at the same time.
  await Promise.all([
    writeSheet(SHEETS.Rankings, rows),
    writeSheet(SHEETS.Players, withRank),
  ]);

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
