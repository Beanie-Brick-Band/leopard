"use client";

import type { ColDef, Module } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

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
  rowHeight?: number;
}

export function AppDataGrid<TData>({
  columnDefs,
  rowData,
  className,
  minWidthClassName = "min-w-[720px]",
  rowHeight = 56,
}: AppDataGridProps<TData>) {
  const theme = useTheme();

  return (
    <div
      className="overflow-x-auto"
      data-ag-theme-mode={
        theme.resolvedTheme === "dark" ? "dark-blue" : "light"
      }
    >
      <AgGridReact<TData>
        animateRows
        className={cn("w-full", minWidthClassName, className)}
        columnDefs={columnDefs}
        containerStyle={{ width: "100%" }}
        defaultColDef={defaultColDef}
        domLayout="autoHeight"
        headerHeight={44}
        modules={gridModules}
        overlayNoRowsTemplate="<span class='text-sm'>No rows to display.</span>"
        rowData={rowData}
        rowHeight={rowHeight}
        suppressCellFocus
      />
    </div>
  );
}
