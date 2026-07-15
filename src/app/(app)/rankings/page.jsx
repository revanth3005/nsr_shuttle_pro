"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Medal } from "lucide-react";
import { useRankings, useMe, useApiMutation } from "@/hooks/useApi";
import { api } from "@/lib/client";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { DataGrid } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/excel/schema";

export default function RankingsPage() {
  const { data: me } = useMe();
  const { toast } = useToast();
  const [scope, setScope] = useState("Overall");
  const { data: rows, isLoading } = useRankings(scope);
  const recalc = useApiMutation(() => api.post("/api/rankings"), ["rankings"]);

  const canRecalc = me && me.role !== ROLES.PLAYER;

  const columns = useMemo(
    () => [
      { field: "rank", headerName: "Rank", width: 90, cellRenderer: (p) => medal(p.value) },
      { field: "playerName", headerName: "Player", minWidth: 170 },
      { field: "club", minWidth: 130 },
      { field: "state", minWidth: 120 },
      ...(scope !== "Overall" ? [{ field: "scopeValue", headerName: scope, minWidth: 120 }] : []),
      { field: "points", headerName: "Points", width: 110 },
      { field: "matchesPlayed", headerName: "Played", width: 100 },
      { field: "wins", width: 90 },
      { field: "winPercentage", headerName: "Win %", width: 100, valueFormatter: (p) => `${p.value ?? 0}%` },
      { field: "titlesWon", headerName: "Titles", width: 100 },
    ],
    [scope]
  );

  return (
    <div>
      <PageHeader title="Rankings" description="Composite rankings from points, win rate and titles.">
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-44">
          <option>Overall</option>
          <option>State</option>
          <option>Club</option>
          <option>Yearly</option>
        </Select>
        {canRecalc && (
          <Button variant="outline" onClick={async () => { await recalc.mutateAsync(); toast("Rankings recalculated", "success"); }} disabled={recalc.isPending}>
            <RefreshCw className={`h-4 w-4 ${recalc.isPending ? "animate-spin" : ""}`} /> Recalculate
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <Spinner />
      ) : !rows?.length ? (
        <EmptyState title="No rankings yet" description="Record match results, then recalculate rankings." icon={Medal} />
      ) : (
        <DataGrid rows={rows} columns={columns} />
      )}
    </div>
  );
}

function medal(rank) {
  const m = { 1: "🥇", 2: "🥈", 3: "🥉" }[rank];
  return m ? `${m} ${rank}` : rank;
}
