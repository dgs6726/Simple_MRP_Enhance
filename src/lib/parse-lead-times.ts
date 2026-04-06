import Papa from "papaparse";
import type { LeadTimeData } from "./types";

function parseNum(val: string | undefined | null): number {
  if (val == null || val === "" || val === "#DIV/0!") return 0;
  // Strip $, commas, whitespace, %
  const cleaned = val.replace(/[$,%\s]/g, "").replace(/\(([^)]+)\)/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parsePct(val: string | undefined | null): number {
  if (val == null || val === "") return 0;
  const cleaned = val.replace(/[%\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n / 100;
}

/**
 * Parse the Lead_Times_SOQs CSV file.
 * The file has 2 header rows (variability params) before the real header on row 3.
 */
export function parseLeadTimesCsv(csvText: string): Map<string, LeadTimeData> {
  // Split into lines and skip the first 2 metadata rows
  const lines = csvText.split("\n");
  if (lines.length < 4) return new Map();

  // Rejoin from row 3 onward (the real header + data)
  const dataText = lines.slice(2).join("\n");

  const result = Papa.parse(dataText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const map = new Map<string, LeadTimeData>();

  for (const raw of result.data as Record<string, string>[]) {
    const component = raw["I/C"]?.trim();
    if (!component) continue;

    map.set(component, {
      component,
      description: raw["Description"]?.trim() || "",
      annualDemand: parseNum(raw["2026 Demand"]),
      weeklyDemand: parseNum(raw["Weekly Demand"]),
      stdCost: parseNum(raw["Std Cost"]),
      leadTimeWeeks: parseNum(raw["Lead Time (weeks)"]),
      soq: parseNum(raw["SOQ (Qty)"]),
      avgReceiptQty: parseNum(raw["Average Receipt Qty"]),
      ltDemand: parseNum(raw["LT Demand"]),
      safetyStock: parseNum(raw["Safety Stock"]),
      min: parseNum(raw["Min"]),
      max: parseNum(raw["Max"]),
      average: parseNum(raw["Average"]),
      minDollars: parseNum(raw["Min $"]),
      maxDollars: parseNum(raw["Max $"]),
      avgDollars: parseNum(raw["Average $"]),
      primaryCustomer: raw["Primary Cust"]?.trim() || "",
      primaryCustomerPct: parsePct(raw["Primary Cust %"]),
      totalCustomerCount: parseNum(raw["Total Cust Count"]),
      lastSupplierNum: raw["Last_Supplier_Num"]?.trim() || "",
      lastSupplierName: raw["Last_Supplier_Name"]?.trim() || "",
    });
  }

  return map;
}
