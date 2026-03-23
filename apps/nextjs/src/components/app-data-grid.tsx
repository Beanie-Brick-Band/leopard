"use client";

import type { ColDef, Module } from "ag-grid-community";
import type { CSSProperties } from "react";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRouter } from "next/navigation";

import { cn } from "@package/ui";
import { useTheme } from "@package/ui/theme";

const gridModules: Module[] = [AllCommunityModule];
const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  floatingFilter: true,
  resizable: true,
  flex: 1,
  minWidth: 140,
  cellStyle: { display: "flex", alignItems: "center" },
};

interface AppDataGridProps<TData> {
  columnDefs: ColDef<TData>[];
  rowData: TData[];
  className?: string;
  minWidthClassName?: string;
  onRowNavigate?: (row: TData) => string | undefined;
  rowHeight?: number;
}

export function AppDataGrid<TData>({
  columnDefs,
  rowData,
  className,
  minWidthClassName = "min-w-[720px]",
  onRowNavigate,
  rowHeight = 56,
}: AppDataGridProps<TData>) {
  const router = useRouter();
  const theme = useTheme();
  const isDarkMode = theme.resolvedTheme === "dark";
  const darkModeGridVars: CSSProperties | undefined = isDarkMode
    ? ({
        "--ag-background-color": "var(--card)",
        "--ag-foreground-color": "var(--foreground)",
        "--ag-border-color": "var(--border)",
        "--ag-header-background-color": "var(--muted)",
        "--ag-header-text-color": "var(--foreground)",
        "--ag-chrome-background-color": "var(--muted)",
        "--ag-odd-row-background-color": "var(--card)",
        "--ag-row-hover-color":
          "color-mix(in oklch, var(--accent) 72%, transparent)",
        "--ag-selected-row-background-color":
          "color-mix(in oklch, var(--primary) 18%, var(--card))",
        "--ag-input-background-color": "var(--input)",
        "--ag-input-border-color": "var(--border)",
        "--ag-accent-color": "var(--primary)",
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="overflow-x-auto"
      data-ag-theme-mode={isDarkMode ? "dark" : "light"}
      style={darkModeGridVars}
    >
      <AgGridReact<TData>
        animateRows
        className={cn(
          "w-full",
          minWidthClassName,
          onRowNavigate && "[&_.ag-row]:cursor-pointer",
          className,
        )}
        columnDefs={columnDefs}
        containerStyle={{ width: "100%" }}
        defaultColDef={defaultColDef}
        domLayout="autoHeight"
        headerHeight={44}
        modules={gridModules}
        overlayNoRowsTemplate="<span class='text-sm'>No rows to display.</span>"
        rowData={rowData}
        rowHeight={rowHeight}
        onGridReady={(params) => {
          const firstCol = params.api.getAllDisplayedColumns()[0];
          if (!firstCol) return;

          params.api.applyColumnState({
            state: [{ colId: firstCol.getColId(), sort: "asc" }],
            defaultState: { sort: null },
          });
        }}
        onRowClicked={(event) => {
          if (!onRowNavigate || !event.data) return;

          const target = event.event?.target;
          if (target instanceof Element && target.closest("a, button")) return;

          const href = onRowNavigate(event.data);
          if (!href) return;

          router.push(href);
        }}
        suppressCellFocus
      />
    </div>
  );
}
