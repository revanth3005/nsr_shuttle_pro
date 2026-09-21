import * as XLSX from "xlsx";
import { listPlayersWithStats } from "./player.service.js";
import { clubLeaderboard } from "./club.service.js";
import { listTournaments } from "./tournament.service.js";
import { overallLeaderboard } from "./ranking.service.js";
import { matchesForTournament } from "./match.service.js";
import { registrationsForTournament } from "./registration.service.js";
import { getTournament } from "./tournament.service.js";

// Build tabular data for each report type.
export async function buildReport(type, opts = {}) {
  switch (type) {
    case "players": {
      const players = await listPlayersWithStats();
      return {
        name: "Player_Report",
        rows: players.map((p) => ({
          Name: `${p.firstName} ${p.lastName}`.trim(),
          Club: p.club,
          City: p.city,
          State: p.state,
          Skill: p.skillLevel,
          Points: p.currentPoints,
          Rank: p.currentRanking,
          Played: p.matchesPlayed,
          Wins: p.wins,
          Losses: p.losses,
          "Win %": p.winPercentage,
          Titles: p.titlesWon,
        })),
      };
    }
    case "rankings": {
      const board = await overallLeaderboard();
      return {
        name: "Ranking_Report",
        rows: board.map((r) => ({
          Rank: r.rank,
          Name: r.playerName,
          Club: r.club,
          State: r.state,
          Points: r.points,
          Played: r.matchesPlayed,
          Wins: r.wins,
          "Win %": r.winPercentage,
        })),
      };
    }
    case "clubs": {
      const board = await clubLeaderboard();
      return {
        name: "Club_Performance_Report",
        rows: board.map((c) => ({
          Rank: c.rank,
          Club: c.club,
          Players: c.players,
          Points: c.points,
          Wins: c.wins,
          "Win %": c.winPercentage,
          Titles: c.titlesWon,
        })),
      };
    }
    case "tournament": {
      const t = await getTournament(opts.tournamentId);
      const matches = await matchesForTournament(opts.tournamentId);
      const regs = await registrationsForTournament(opts.tournamentId);
      return {
        name: `Tournament_Report_${(t?.name || "").replace(/\s+/g, "_")}`,
        rows: matches.map((m) => ({
          Round: m.round,
          Court: m.court,
          Side1: m.side1Name,
          Side2: m.side2Name,
          Set1: m.set1,
          Set2: m.set2,
          Set3: m.set3,
          Status: m.status,
        })),
        meta: {
          Tournament: t?.name,
          Registrations: regs.length,
          Matches: matches.length,
        },
      };
    }
    default:
      return { name: "Report", rows: [] };
  }
}

export function reportToBuffer(report, format) {
  const ws = XLSX.utils.json_to_sheet(report.rows);
  if (format === "csv") {
    return { buffer: Buffer.from(XLSX.utils.sheet_to_csv(ws)), mime: "text/csv", ext: "csv" };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    buffer,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  };
}
