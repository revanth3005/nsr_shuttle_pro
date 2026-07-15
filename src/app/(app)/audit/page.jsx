"use client";

import { useMemo } from "react";
import { useAudit } from "@/hooks/useApi";
import { PageHeader, Spinner } from "@/components/shared";
import { DataGrid } from "@/components/data-grid";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const { data: rows, isLoading } = useAudit();
  const columns = useMemo(
    () => [
      { field: "timestamp", headerName: "Time", minWidth: 160, valueFormatter: (p) => formatDate(p.value) },
      { field: "userName", headerName: "User", minWidth: 140 },
      { field: "action", minWidth: 170 },
      { field: "entity", minWidth: 120 },
      { field: "details", minWidth: 220, flex: 2 },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Audit Log" description="System activity trail (admin only)." />
      {isLoading ? <Spinner /> : <DataGrid rows={rows} columns={columns} />}
    </div>
  );
}
