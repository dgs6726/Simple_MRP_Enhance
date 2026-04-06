import Papa from "papaparse";
import type { MrpDetailRow } from "./types";

/** Column name mapping from CSV headers to our field names */
const COLUMN_MAP: Record<string, keyof MrpDetailRow> = {
  Vendor: "vendor",
  Component: "component",
  Description: "description",
  "Parent Part": "parentPart",
  Date: "date",
  QOH: "qoh",
  Demand: "demand",
  "Open Orders": "openOrders",
  Net: "net",
  RunTotal: "runTotal",
  "Final Sort": "finalSort",
  Index: "index",
  "Inventory.Std Cost": "stdCost",
  "Extended Cost": "extendedCost",
};

function parseNum(val: string | undefined | null): number {
  if (val == null || val === "") return 0;
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(val: string | undefined | null): string {
  if (!val) return "";
  // Handle both YYYY-MM-DD and M/D/YYYY formats
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function parseMrpCsv(csvText: string): MrpDetailRow[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter(
      (e) => e.type !== "FieldMismatch"
    );
    if (criticalErrors.length > 0) {
      console.warn("CSV parse warnings:", criticalErrors);
    }
  }

  return (result.data as Record<string, string>[]).map((raw) => ({
    vendor: raw["Vendor"]?.trim() || "",
    component: raw["Component"]?.trim() || "",
    description: raw["Description"]?.trim() || "",
    parentPart: raw["Parent Part"]?.trim() || "",
    date: parseDate(raw["Date"]),
    qoh: parseNum(raw["QOH"]),
    demand: parseNum(raw["Demand"]),
    openOrders: parseNum(raw["Open Orders"]),
    net: parseNum(raw["Net"]),
    runTotal: parseNum(raw["RunTotal"]),
    finalSort: parseNum(raw["Final Sort"]),
    index: parseNum(raw["Index"]),
    stdCost: parseNum(raw["Inventory.Std Cost"]),
    extendedCost: parseNum(raw["Extended Cost"]),
  }));
}
