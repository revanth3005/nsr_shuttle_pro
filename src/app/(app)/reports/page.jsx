"use client";

import { FileText, FileSpreadsheet, Download, Printer } from "lucide-react";
import { useTournaments } from "@/hooks/useApi";
import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const REPORTS = [
  { type: "tournament", title: "Tournament Report", desc: "Fixtures, results and registrations for a tournament.", needsTournament: true },
  { type: "rankings", title: "Ranking Report", desc: "Full overall ranking table with points and win rates." },
  { type: "players", title: "Player Report", desc: "All players with statistics and standings." },
  { type: "clubs", title: "Club Performance Report", desc: "Club leaderboard with aggregated performance." },
];

export default function ReportsPage() {
  const { data: tournaments } = useTournaments();
  const [tid, setTid] = useState("");

  function download(type, format) {
    const params = new URLSearchParams({ type, format });
    if (type === "tournament") {
      if (!tid) return alert("Select a tournament first.");
      params.set("tournamentId", tid);
    }
    window.open(`/api/reports?${params.toString()}`, "_blank");
  }

  return (
    <div>
      <PageHeader title="Reports" description="Export data as Excel or CSV. Use Print for a PDF via your browser.">
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save as PDF</Button>
      </PageHeader>

      <div className="mb-6 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium">Tournament (for Tournament Report)</label>
        <Select value={tid} onChange={(e) => setTid(e.target.value)}>
          <option value="">Select a tournament…</option>
          {tournaments?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> {r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => download(r.type, "xlsx")}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={() => download(r.type, "csv")}><Download className="h-4 w-4" /> CSV</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
