import { insertRows, filter, updateRow, deleteRow } from "../excel/store.js";
import { SHEETS } from "../excel/schema.js";
import { genId, fullName } from "../utils.js";
import { getPlayer } from "./player.service.js";
import { getTeam } from "./team.service.js";
import { fixtureParticipants } from "./registration.service.js";
import { getTournament } from "./tournament.service.js";

// ---------------------------------------------------------------------------
// Fixture generation engine.
// Supports Knockout, Round Robin and League + Knockout.
// ---------------------------------------------------------------------------

const KO_ROUND_NAMES = {
  64: "Round of 64",
  32: "Round of 32",
  16: "Round of 16",
  8: "Quarter Finals",
  4: "Semi Finals",
  2: "Final",
};

// Fixed left-to-right progression of knockout round names — used both to
// generate the full bracket up front and to know which round feeds which.
export const KO_ROUND_ORDER = ["Round of 64", "Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Final"];

function roundName(slots) {
  return KO_ROUND_NAMES[slots] || `Round of ${slots}`;
}

// Resolve a raw side id (player or team) to a display name — used when the
// knockout engine advances a winner into the next round's placeholder.
async function resolveName(id) {
  if (!id) return "TBD";
  const p = await getPlayer(id);
  if (p) return fullName(p);
  const t = await getTeam(id);
  if (t) return t.name;
  return String(id);
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

async function sideName(participant) {
  if (!participant) return "BYE";
  if (participant.isTeam) {
    const t = await getTeam(participant.id);
    return t?.name || "Team";
  }
  const p = await getPlayer(participant.id);
  return fullName(p) || "Player";
}

function shuffle(arr) {
  // Fisher–Yates with Math.random so each regeneration yields a fresh draw.
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function makeMatch(tournamentId, round, court, s1, s2) {
  const [name1, name2] = await Promise.all([sideName(s1), sideName(s2)]);
  return {
    id: genId("MTC"),
    tournamentId,
    round,
    court: court || "",
    matchDate: "",
    matchTime: "",
    side1Id: s1?.id || "",
    side2Id: s2?.id || "",
    side1Name: name1,
    side2Name: name2,
    set1: "",
    set2: "",
    set3: "",
    winnerId: !s2 && s1 ? s1.id : "", // auto-advance byes
    loserId: "",
    duration: "",
    status: !s2 && s1 ? "Walkover" : "Scheduled",
  };
}

// Knockout: build the FULL bracket up front, like a printed tournament sheet.
// Round 1 is seeded with real participants (padded with byes to the next
// power of two — byes auto-win immediately). Every later round (Quarter
// Finals, Semi Finals, Final, ...) is created as a "TBD vs TBD" placeholder;
// advanceKnockout() fills each one in as the round before it finishes.
async function generateKnockout(tournamentId, participants) {
  const n = participants.length;
  const size = nextPowerOfTwo(n || 2);
  const shuffled = shuffle(participants);
  const byesNeeded = size - n;

  // Build round-1 pairing slots: each of the first `byesNeeded` seeds gets a
  // bye (auto-advances). The rest pair up against each other. This guarantees
  // a bye is never paired against another bye — which would otherwise create
  // a dead "BYE vs BYE" match that can never be won and blocks the bracket.
  const slots = [];
  let idx = 0;
  for (let i = 0; i < byesNeeded; i++) slots.push(shuffled[idx++], null);
  while (idx < n) slots.push(shuffled[idx++], shuffled[idx++]);

  const matches = [];
  let court = 1;
  for (let i = 0; i < slots.length; i += 2) {
    matches.push(await makeMatch(tournamentId, roundName(size), `Court ${court}`, slots[i], slots[i + 1]));
    court = (court % 4) + 1;
  }

  let remaining = size / 2;
  while (remaining >= 2) {
    const count = remaining / 2;
    for (let i = 0; i < count; i++) matches.push(placeholderMatch(tournamentId, roundName(remaining)));
    remaining = remaining / 2;
  }
  return matches;
}

// Fill in the next knockout round's placeholders wherever both feeder matches
// are decided (Completed or a Walkover bye). Idempotent and safe to call after
// every result — re-reads from the store each pass so a chain of byes (e.g.
// two walkovers back to back) resolves in a single call.
export async function advanceKnockout(tournamentId) {
  const t = await getTournament(tournamentId);
  if (!t || t.format !== "Knockout") return { stage: "n/a", advanced: 0 };

  let totalAdvanced = 0;
  for (let pass = 0; pass < KO_ROUND_ORDER.length; pass++) {
    const all = await filter(SHEETS.Matches, (m) => String(m.tournamentId) === String(tournamentId));
    const used = KO_ROUND_ORDER.filter((name) => all.some((m) => m.round === name));
    if (used.length < 2) break;

    let advancedThisPass = 0;
    for (let i = 0; i < used.length - 1; i++) {
      const curr = all.filter((m) => m.round === used[i]);
      const next = all.filter((m) => m.round === used[i + 1]);
      for (let k = 0; k < next.length; k++) {
        const nm = next[k];
        if (nm.side1Id && nm.side2Id) continue; // already filled
        const a = curr[2 * k];
        const b = curr[2 * k + 1];
        const isDone = (m) => m && (m.status === "Completed" || m.status === "Walkover") && m.winnerId;
        if (!isDone(a) || !isDone(b)) continue;
        const [name1, name2] = await Promise.all([resolveName(a.winnerId), resolveName(b.winnerId)]);
        await updateRow(SHEETS.Matches, nm.id, {
          side1Id: a.winnerId,
          side2Id: b.winnerId,
          side1Name: name1,
          side2Name: name2,
        });
        advancedThisPass++;
      }
    }
    totalAdvanced += advancedThisPass;
    if (!advancedThisPass) break;
  }
  return { stage: totalAdvanced ? "advanced" : "none", advanced: totalAdvanced };
}

// Round Robin: everyone plays everyone (circle method).
async function generateRoundRobin(tournamentId, participants) {
  const players = [...participants];
  if (players.length % 2 !== 0) players.push(null); // bye marker
  const n = players.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...players];
  const matches = [];
  for (let r = 0; r < rounds; r++) {
    let court = 1;
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) {
        matches.push(await makeMatch(tournamentId, `Round ${r + 1}`, `Court ${court}`, a, b));
        court = (court % 4) + 1;
      }
    }
    // Rotate, keeping first fixed.
    arr.splice(1, 0, arr.pop());
  }
  return matches;
}

// League + Knockout: a round-robin group stage. Knockout is generated later
// (after standings are known) via generateKnockoutFromQualifiers.
async function generateLeaguePlusKnockout(tournamentId, participants) {
  return generateRoundRobin(tournamentId, participants);
}

// Placeholder for a not-yet-determined playoff match. Sides are filled in
// later by the playoff engine as league results come in, so the tree shows
// "TBD vs TBD" cards right away instead of appearing only once qualified.
function placeholderMatch(tournamentId, round) {
  return {
    id: genId("MTC"),
    tournamentId,
    round,
    court: "",
    matchDate: "",
    matchTime: "",
    side1Id: "",
    side2Id: "",
    side1Name: "TBD",
    side2Name: "TBD",
    set1: "",
    set2: "",
    set3: "",
    winnerId: "",
    loserId: "",
    duration: "",
    status: "Scheduled",
  };
}

// Page-playoff placeholders sit alongside the league stage: with 3+
// participants that's Qualifier 1 + Semi Final + Final; with exactly 2
// participants (their single round-robin match already decides it) just Final.
function generatePlayoffPlaceholders(tournamentId, participantCount) {
  if (participantCount === 2) return [placeholderMatch(tournamentId, "Final")];
  if (participantCount >= 3) {
    return [
      placeholderMatch(tournamentId, "Qualifier 1"),
      placeholderMatch(tournamentId, "Semi Final"),
      placeholderMatch(tournamentId, "Final"),
    ];
  }
  return [];
}

export async function generateFixtures(tournamentId) {
  const t = await getTournament(tournamentId);
  if (!t) {
    const err = new Error("Tournament not found");
    err.status = 404;
    throw err;
  }
  const participants = await fixtureParticipants(tournamentId);
  if (participants.length < 2) {
    const isDoubles = String(t.category || "").toLowerCase().includes("doubles");
    const err = new Error(
      isDoubles
        ? "Need at least 2 teams to generate fixtures — add or generate teams first"
        : "Need at least 2 players to generate fixtures — add players first"
    );
    err.status = 400;
    throw err;
  }

  // Regenerate: clear any existing matches for this tournament first so the
  // action is idempotent (the client confirms before overwriting). Player
  // stats/rankings are always fully recomputed from the Matches sheet by
  // recalculateRankings() below, so a plain delete here is enough — no
  // per-match revert bookkeeping needed.
  const existing = await filter(SHEETS.Matches, (m) => String(m.tournamentId) === String(tournamentId));
  for (const m of existing) await deleteRow(SHEETS.Matches, m.id);

  let matches;
  switch (t.format) {
    case "Round Robin":
      matches = await generateRoundRobin(tournamentId, participants);
      matches.push(...generatePlayoffPlaceholders(tournamentId, participants.length));
      break;
    case "League":
    case "League + Knockout":
      matches = await generateLeaguePlusKnockout(tournamentId, participants);
      matches.push(...generatePlayoffPlaceholders(tournamentId, participants.length));
      break;
    case "Knockout":
    default:
      matches = await generateKnockout(tournamentId, participants);
      break;
  }

  await insertRows(SHEETS.Matches, matches);

  // Byes/walkovers already have a winner the moment they're created (there's
  // no opponent to score against, so they never go through recordResult) —
  // resync rankings now so they're immediately counted as a played win
  // instead of undercounting the player until the next real result.
  const { recalculateRankings } = await import("./ranking.service.js");
  await recalculateRankings();

  // Immediately resolve any bye chains so the bracket reflects auto-advanced
  // walkovers the moment it's generated, not only after the next result.
  if (t.format === "Knockout") await advanceKnockout(tournamentId);

  return matches;
}
