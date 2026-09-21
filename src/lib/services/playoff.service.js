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

// A league round is "Round 1", "Round 2", ... — the DIGIT is required. The old
// pattern was /^round\s/i, which also swallowed the knockout rounds "Round of
// 16" / "Round of 32" / "Round of 64" and counted them as league play.
const LEAGUE_RE = /^round\s+\d+\s*$/i;
const isLeagueMatch = (m) => LEAGUE_RE.test(String(m.round || ""));

const PLAYOFF_ROUNDS = ["Qualifier 1", "Semi Final", "Final"];

// A result counts towards the table once it is decided. Walkovers count too:
// they are real wins (a true bye has no opponent, so tally() skips it on the
// "both sides present" check rather than on status).
const isDecided = (m) => m.status === "Completed" || m.status === "Walkover";

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

// ---------------------------------------------------------------------------
// Tie-breaking
// ---------------------------------------------------------------------------
// Sides level on matches won are separated in BWF order:
//
//   1. Games (set) difference
//   2. Net Points Rate — points difference, normalised by games played, so a
//      side that won 2-0 isn't punished against one that needed three games.
//   3. Point +/- — the raw difference, as a final margin check.
//   4. Head-to-head — only the matches played BETWEEN the tied sides. With
//      exactly two that is "who won the match"; with three or more it is a
//      mini-league among them (wins, then set +/-, then point +/-), which is
//      how a circular tie (A beat B, B beat C, C beat A) is resolved.
//   5. Drawing of lots
//
// Head-to-head deliberately sits BELOW the margin criteria: that is the order
// BWF specifies, and it also keeps the table self-explanatory — the NPR column
// on screen matches the sort, instead of the order being driven by a
// mini-league the reader cannot see.

// Mini-league over just the matches where BOTH sides are among `ids`.
function headToHead(ids, matches) {
  const pool = new Set(ids.map(String));
  const mini = {};
  for (const id of ids) mini[id] = { wins: 0, setDiff: 0, pointDiff: 0, played: 0 };
  for (const m of matches) {
    if (!isDecided(m) || !m.side1Id || !m.side2Id) continue;
    if (!pool.has(String(m.side1Id)) || !pool.has(String(m.side2Id))) continue;
    const s1 = mini[m.side1Id];
    const s2 = mini[m.side2Id];
    if (!s1 || !s2) continue;
    const { a, b, pf, pa } = tallySets(m);
    s1.played++; s2.played++;
    s1.setDiff += a - b; s2.setDiff += b - a;
    s1.pointDiff += pf - pa; s2.pointDiff += pa - pf;
    if (String(m.winnerId) === String(m.side1Id)) s1.wins++;
    else if (String(m.winnerId) === String(m.side2Id)) s2.wins++;
  }
  return mini;
}

// Deterministic "drawing of lots". A real draw is random, but a table that
// reshuffled on every page load would be useless — so the lot is seeded from
// the tournament id plus the side id (FNV-1a): stable forever for a given
// tournament, yet uncorrelated with the name. Sorting alphabetically, which
// this replaces, permanently favours whoever is early in the alphabet.
function lotValue(tournamentId, id) {
  const str = `${tournamentId}:${id}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Every criterion below wins, in order, as comparable numbers. Used both to
// sort and to work out WHICH rule actually separated two sides.
function tieKeys(row, h2h) {
  const h = h2h[row.id] || { wins: 0, setDiff: 0, pointDiff: 0 };
  return [
    { label: "set +/-", value: row.setDiff },
    { label: "NPR", value: netPointsRate(row) ?? 0 },
    { label: "point +/-", value: row.pointDiff },
    { label: "head-to-head", value: h.wins },
    { label: "head-to-head", value: h.setDiff },
    { label: "head-to-head", value: h.pointDiff },
  ];
}

// Order one group of sides that are level on matches won.
function resolveTier(tier, matches, tournamentId) {
  const h2h = headToHead(tier.map((r) => r.id), matches);
  const sorted = [...tier].sort((x, y) => {
    const kx = tieKeys(x, h2h);
    const ky = tieKeys(y, h2h);
    for (let i = 0; i < kx.length; i++) {
      if (ky[i].value !== kx[i].value) return ky[i].value - kx[i].value;
    }
    return lotValue(tournamentId, x.id) - lotValue(tournamentId, y.id);
  });

  // Record how each side was separated from its neighbours, so the table can
  // say "decided on head-to-head" or "drawn by lot" instead of leaving the
  // organiser to guess.
  return sorted.map((row, i) => {
    const neighbours = [sorted[i - 1], sorted[i + 1]].filter(Boolean);
    let decidedBy = null;
    for (const other of neighbours) {
      const ka = tieKeys(row, h2h);
      const kb = tieKeys(other, h2h);
      const idx = ka.findIndex((k, j) => k.value !== kb[j].value);
      const label = idx === -1 ? "lot" : ka[idx].label;
      // A lot beats any other label: it is the one an organiser must be able
      // to point at. Otherwise keep the first (strongest) rule that applied.
      if (label === "lot") { decidedBy = "lot"; break; }
      if (!decidedBy) decidedBy = label;
    }
    const h = h2h[row.id] || { wins: 0, setDiff: 0, pointDiff: 0, played: 0 };
    return {
      ...row,
      decidedBy,
      tiedOnWins: true,
      // Everything the UI needs to SHOW why this row sits where it does:
      // which sides were level, and each one's record in the matches played
      // among only those sides.
      tieGroupId: `w${row.wins}`,
      h2h: { wins: h.wins, setDiff: h.setDiff, pointDiff: h.pointDiff, played: h.played },
    };
  });
}

// Full ranking: tier by matches won, then resolve each tie with the chain
// above. `matches` must be the fixtures this table is computed from (a single
// pool for a group table, everything for the tournament table).
function rankStandings(rows, matches, tournamentId) {
  const tiers = new Map();
  for (const r of rows) {
    if (!tiers.has(r.wins)) tiers.set(r.wins, []);
    tiers.get(r.wins).push(r);
  }
  const ordered = [];
  for (const wins of [...tiers.keys()].sort((a, b) => b - a)) {
    const tier = tiers.get(wins);
    if (tier.length === 1) {
      ordered.push({ ...tier[0], decidedBy: null, tiedOnWins: false, tieGroupId: null, h2h: null });
    }
    else ordered.push(...resolveTier(tier, matches, tournamentId));
  }
  return ordered.map((r, i) => ({ ...r, rank: i + 1 }));
}

// Standings table for a tournament. Every row carries TWO positions, because
// they answer two different questions and used to be conflated:
//
//   leagueRank — frozen from LEAGUE matches only. This is what seeds the
//                playoffs (#1 vs #2, #3 into the Semi Final) and must never
//                shift once Qualifier 1/Semi/Final are underway.
//   rank       — the position shown in the table, recomputed from the side's
//                FULL run (league + playoffs), which is what the Played/W/L/
//                Set +-/NPR/Pts columns already show.
//
// Previously the table displayed league+playoff totals but ordered rows by the
// league-only rank, so winning a playoff match bumped a side's W column
// without moving it up the table — the champion could sit below a side they
// had just beaten.
// Shared accumulator. `ensure` seeds a row (so a side appears with zeros
// before it has played) and `tally` folds one decided match into the table.
// Both the overall standings and the per-group tables run on this, so a pool
// table can never drift from the tournament table's ranking rule.
function makeTable(lookup) {
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
    if (!isDecided(m)) return;
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

  // Seed rows for both sides of a fixture without scoring it.
  const seedSides = (m) => {
    if (m.side1Id) ensure(m.side1Id);
    if (m.side2Id) ensure(m.side2Id);
  };

  // Unranked rows with the derived columns filled in. Ranking is a separate
  // step because the tie-break needs the match list, not just the totals.
  const rows = () =>
    Object.values(table).map((r) => ({ ...r, points: r.wins * 2, netPointsRate: netPointsRate(r) }));

  return { table, ensure, tally, seedSides, rows };
}

// Standings for one pool of a Group + Knockout tournament. Returns
// [{ group: "Group A", rows: [...] }, ...] in group order, each row ranked by
// the same Wins -> NPR rule as everywhere else. Rows appear as soon as the
// fixtures exist, so a pool table is populated (with zeros) from the draw.
export async function groupStandings(tournamentId) {
  const [all, lookup] = await Promise.all([matchesForTournament(tournamentId), buildLookup()]);
  return computeGroupStandings({ all, lookup, tournamentId });
}

// Pure-ish compute steps take data that has ALREADY been fetched. playoffState
// loads the match list and the player/team lookup once and hands the same
// objects to every table it builds — it used to re-read both for each one,
// which on a network database meant the tournament page paid for the same
// query three or four times.
function computeGroupStandings({ all, lookup, tournamentId }) {
  const groupMatches = all.filter((m) => m.groupName);
  if (!groupMatches.length) return [];

  const byGroup = new Map();
  for (const m of groupMatches) {
    if (!byGroup.has(m.groupName)) byGroup.set(m.groupName, []);
    byGroup.get(m.groupName).push(m);
  }

  return [...byGroup.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([group, ms]) => {
      const t = makeTable(lookup);
      ms.forEach(t.seedSides);
      ms.forEach(t.tally);
      return {
        group,
        complete: ms.every(isDecided),
        // Head-to-head inside a pool means only that pool's fixtures.
        rows: rankStandings(t.rows(), ms, tournamentId),
      };
    });
}

export async function leagueStandings(tournamentId) {
  const [all, lookup, tournament] = await Promise.all([
    matchesForTournament(tournamentId),
    buildLookup(),
    getTournament(tournamentId),
  ]);
  return computeLeagueStandings({ all, lookup, tournament, tournamentId });
}

function computeLeagueStandings({ all, lookup, tournament, tournamentId }) {
  // Formats with no "Round N" league stage: every match counts towards the
  // overall table, because there is no separate seed to protect. Previously
  // only rounds literally named "Round ..." or "Final" were tallied, which
  // meant a Quarter Finals / Semi Finals / Final bracket showed nothing until
  // the Final was played — and then listed only the two finalists.
  const format = String(tournament?.format || "");
  const isKnockout = format === "Knockout" || format === "Group + Knockout";
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
    if (!isDecided(m)) return;
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

  // Which matches set the frozen seed, and which are folded in afterwards.
  // Knockout: everything counts and there is no seed to protect. League/Round
  // Robin: the "Round N" games set the seed, then every later stage (Qualifier
  // 1 / Semi Final / Final) is added on top for the displayed totals.
  const seedMatches = isKnockout ? all : all.filter(isLeagueMatch);
  const laterMatches = isKnockout ? [] : all.filter((m) => !isLeagueMatch(m));

  // Give every participant a row up front, even before any result exists, so
  // the table lists the full field the moment fixtures are generated and then
  // fills in live as results come in — rather than growing a row at a time.
  // TBD placeholders have no side ids yet and are simply skipped.
  for (const m of all) {
    if (m.side1Id) ensure(m.side1Id);
    if (m.side2Id) ensure(m.side2Id);
  }

  seedMatches.forEach(tally);

  // Freeze the playoff SEED from the league stage only — tie-broken by the
  // same chain (head-to-head first), since this decides who plays whom.
  const seedRows = Object.values(table).map((r) => ({
    ...r, points: r.wins * 2, netPointsRate: netPointsRate(r),
  }));
  const leagueRankById = Object.fromEntries(
    rankStandings(seedRows, seedMatches, tournamentId).map((r) => [r.id, r.rank])
  );

  // Now fold in the later stages — same accumulators, so Played/W/L/Pts
  // become the side's full total through the tournament.
  laterMatches.forEach(tally);

  // Display rank is re-derived from those full totals with the same rule, so
  // the side that has actually won the most matches is the side on top.
  const finalRows = Object.values(table).map((r) => ({
    ...r,
    points: r.wins * 2,
    netPointsRate: netPointsRate(r),
    leagueRank: leagueRankById[r.id] ?? 999,
  }));
  return rankStandings(finalRows, all, tournamentId);
}

// "Is the stage that determines the table finished?" — for a knockout that is
// the whole bracket; for a league it is just the round-robin stage (which is
// what gates playoff generation).
export async function leagueComplete(tournamentId) {
  const [all, tournament] = await Promise.all([
    matchesForTournament(tournamentId),
    getTournament(tournamentId),
  ]);
  return computeLeagueComplete({ all, tournament });
}

function computeLeagueComplete({ all, tournament }) {
  const format = String(tournament?.format || "");
  const relevant =
    format === "Knockout" || format === "Group + Knockout"
      ? all
      : all.filter(isLeagueMatch);
  return relevant.length > 0 && relevant.every(isDecided);
}

export async function playoffState(tournamentId) {
  // Three queries total for the whole tournament page, instead of the same
  // match list and lookup being fetched again inside each table builder.
  const [all, tournament, lookup] = await Promise.all([
    matchesForTournament(tournamentId),
    getTournament(tournamentId),
    buildLookup(),
  ]);
  const standings = computeLeagueStandings({ all, lookup, tournament, tournamentId });
  const complete = computeLeagueComplete({ all, tournament });
  const groups = computeGroupStandings({ all, lookup, tournamentId });
  return {
    standings,
    groups,
    // Whether the pools are all played — this is what gates building the
    // knockout bracket out of the qualifiers.
    groupsComplete: groups.length > 0 && groups.every((g) => g.complete),
    leagueComplete: complete,
    format: tournament?.format || "",
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

  // Seed off the frozen LEAGUE rank, never the array order — leagueStandings
  // now returns rows ordered by full-run performance (which shifts as playoff
  // results come in), so indexing the returned array directly would re-seed
  // Qualifier 1/Semi Final from mid-playoff form.
  const seeds = [...standings].sort((a, b) => a.leagueRank - b.leagueRank);

  const all = await matchesForTournament(tournamentId);
  const touched = new Set();
  let advanced = 0;
  const mark = (round, did) => { if (did) { advanced++; touched.add(round); } };

  if (standings.length === 2) {
    // Only two participants — a single Final, no Qualifier/Semi stage.
    const final = await ensureStage(tournamentId, all, "Final");
    mark("Final", await fillSide(final, 1, seeds[0].id));
    mark("Final", await fillSide(final, 2, seeds[1].id));
  } else {
    const q1 = await ensureStage(tournamentId, all, "Qualifier 1");
    const semi = await ensureStage(tournamentId, all, "Semi Final");
    const final = await ensureStage(tournamentId, all, "Final");

    // Qualifier 1: #1 vs #2 — both known the instant the league finishes.
    mark("Qualifier 1", await fillSide(q1, 1, seeds[0].id));
    mark("Qualifier 1", await fillSide(q1, 2, seeds[1].id));

    // Semi Final: #3 is known immediately; the Qualifier 1 loser only once
    // Qualifier 1 is decided.
    mark("Semi Final", await fillSide(semi, 2, seeds[2].id));
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
