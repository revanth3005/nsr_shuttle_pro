"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Reusable professional data table built on AG Grid. Column defs are passed in;
// sensible defaults (sortable, filterable, resizable) are applied.
export function DataGrid({ rows, columns, height = 560, onRowClicked, getRowId }) {
  const { theme } = useTheme();
  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 110 }),
    []
  );

  return (
    <div
      className={theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
      style={{ height, width: "100%", "--ag-font-family": "inherit" }}
    >
      <AgGridReact
        rowData={rows || []}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        animateRows
        pagination
        paginationPageSize={20}
        paginationPageSizeSelector={[10, 20, 50, 100]}
        onRowClicked={onRowClicked}
        getRowId={getRowId}
      />
    </div>
  );
}
