"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";

// ---- Auth ----
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api.get("/api/auth/me") });

// ---- Generic list/detail hooks ----
export const useDashboard = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => api.get("/api/dashboard") });

// Public, unauthenticated platform totals — used on the login page.
export const usePublicStats = () =>
  useQuery({ queryKey: ["publicStats"], queryFn: () => api.get("/api/public/stats") });

export const usePlayers = (q) =>
  useQuery({
    queryKey: ["players", q || ""],
    queryFn: () => api.get(`/api/players${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

export const usePlayer = (id) =>
  useQuery({ queryKey: ["player", id], queryFn: () => api.get(`/api/players/${id}`), enabled: !!id });

export const usePlayerStats = (id) =>
  useQuery({ queryKey: ["playerStats", id], queryFn: () => api.get(`/api/stats/player/${id}`), enabled: !!id });

export const useClubs = () =>
  useQuery({ queryKey: ["clubs"], queryFn: () => api.get("/api/clubs") });

export const useClubLeaderboard = () =>
  useQuery({ queryKey: ["clubLeaderboard"], queryFn: () => api.get("/api/clubs/leaderboard") });

export const useTournaments = () =>
  useQuery({ queryKey: ["tournaments"], queryFn: () => api.get("/api/tournaments") });

export const useTournament = (id) =>
  useQuery({ queryKey: ["tournament", id], queryFn: () => api.get(`/api/tournaments/${id}`), enabled: !!id });

export const useTournamentFixtures = (id) =>
  useQuery({ queryKey: ["fixtures", id], queryFn: () => api.get(`/api/tournaments/${id}/fixtures`), enabled: !!id });

export const useTournamentRegistrations = (id) =>
  useQuery({ queryKey: ["tournamentRegs", id], queryFn: () => api.get(`/api/tournaments/${id}/registrations`), enabled: !!id });

export const useTournamentTeams = (id) =>
  useQuery({ queryKey: ["tournamentTeams", id], queryFn: () => api.get(`/api/tournaments/${id}/teams`), enabled: !!id });

export const useTournamentPlayoffs = (id) =>
  useQuery({ queryKey: ["playoffs", id], queryFn: () => api.get(`/api/tournaments/${id}/playoffs`), enabled: !!id });

export const useTeams = () =>
  useQuery({ queryKey: ["teams"], queryFn: () => api.get("/api/teams") });

export const useRegistrations = () =>
  useQuery({ queryKey: ["registrations"], queryFn: () => api.get("/api/registrations") });

export const useMatches = (tournamentId) =>
  useQuery({
    queryKey: ["matches", tournamentId || "all"],
    queryFn: () => api.get(`/api/matches${tournamentId ? `?tournamentId=${tournamentId}` : ""}`),
  });

export const useRankings = (scope, scopeValue) =>
  useQuery({
    queryKey: ["rankings", scope, scopeValue],
    queryFn: () =>
      api.get(`/api/rankings?scope=${scope || "Overall"}${scopeValue ? `&scopeValue=${encodeURIComponent(scopeValue)}` : ""}`),
  });

export const usePointsConfig = () =>
  useQuery({ queryKey: ["pointsConfig"], queryFn: () => api.get("/api/points-config") });

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/api/notifications"),
    refetchInterval: 30_000,
  });

export const useAudit = () =>
  useQuery({ queryKey: ["audit"], queryFn: () => api.get("/api/audit") });

// ---- Mutations helper ----
// Query keys for data that's shared/derived across many pages (dashboard
// stats, rankings, leaderboards, player stats, etc). Almost every write in
// this app — a match result, a registration, a new team, a status change —
// can shift one of these, so rather than hand-list the exact dependencies at
// every call site (easy to under-list and end up with a stale page), any
// mutation that declares it changed *something* refreshes this whole set too.
const GLOBAL_KEYS = [
  "dashboard", "players", "player", "playerStats", "clubs", "clubLeaderboard",
  "tournaments", "rankings", "matches", "fixtures", "playoffs", "teams",
];

export function useApiMutation(fn, invalidate = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      const keys = invalidate.length ? Array.from(new Set([...invalidate, ...GLOBAL_KEYS])) : invalidate;
      keys.forEach((key) => qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }));
    },
  });
}
