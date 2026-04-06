import Papa from "papaparse";
import type { MrpDetailRow } from "./types";

function parseNum(val: string | undefined | null): number {
  if (val == null || val === "" || val === "#N/A" || val === "#VALUE!" || val === "#DIV/0!") return 0;
  const n = parseFloat(val.replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Convert Excel serial date number to ISO date string */
function excelSerialToDate(serial: number): string {
  if (!serial || serial < 1) return "";
  // Excel epoch: Jan 0, 1900 (with the Lotus 1-2-3 leap year bug)
  // JS epoch: Jan 1, 1970
  // Days between: 25569
  const msPerDay = 86400000;
  const d = new Date((serial - 25569) * msPerDay);
  return d.toISOString().split("T")[0];
}

/** Parse ISO date string (YYYY-MM-DD) or other date formats */
function parseDate(val: string | undefined | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/**
 * Detect which CSV format we're dealing with and parse accordingly.
 * - Old format: has "Final Sort", "RunTotal", "Inventory.Std Cost" columns
 * - New format: has "LastReceipt", "Net & Orders", "DOS" columns
 */
export function parseMrpCsv(csvText: string): MrpDetailRow[] {
  // Check if this is the new format by looking for its unique headers
  const firstLine = csvText.split("\n")[0];
  const isNewFormat =
    firstLine.includes("Net & Orders") || firstLine.includes("LastReceipt");

  if (isNewFormat) {
    return parseNewFormat(csvText);
  }
  return parseOldFormat(csvText);
}

/** Parse the original MRP export format */
function parseOldFormat(csvText: string): MrpDetailRow[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  return (result.data as Record<string, string>[]).map((raw, idx) => ({
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
    index: parseNum(raw["Index"]) || idx,
    stdCost: parseNum(raw["Inventory.Std Cost"]),
    extendedCost: parseNum(raw["Extended Cost"]),
  }));
}

/** Parse the new MRP Demand CSV format */
function parseNewFormat(csvText: string): MrpDetailRow[] {
  // The new format has 2 header rows: row 1 = display headers, row 2 = type hints
  // Skip row 2 by removing it before parsing
  const lines = csvText.split("\n");
  if (lines.length < 3) return [];
  const cleanedCsv = [lines[0], ...lines.slice(2)].join("\n");

  const result = Papa.parse(cleanedCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (result.errors.length > 0) {
    const critical = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (critical.length > 0) console.warn("CSV parse warnings:", critical);
  }

  const rows: MrpDetailRow[] = [];

  (result.data as Record<string, string>[]).forEach((raw, idx) => {
    const component = raw["Component"]?.trim() || "";
    if (!component) return;

    const parentPart = raw["Parent Part"]?.trim() || "";
    const demand = parseNum(raw["Demand"]);
    const openOrders = parseNum(raw["Open Orders"]);
    const dueSerial = parseNum(raw["Due"]);
    const date = excelSerialToDate(dueSerial);
    const qoh = parseNum(raw["QOH"]);
    const netAndOrders = parseNum(raw["Net & Orders"]);
    const stdCost = parseNum(raw["Net"]); // "Net" column in new format = unit cost
    const vendor = raw["Vendor"]?.trim() || "";

    // Derive finalSort:
    // PO/Inventory row: Open Orders > 0 and parent starts with "WH"
    // Demand row: Demand > 0
    // First row per item with WH parent and no demand = inventory snapshot
    let finalSort: number;
    if (openOrders > 0 && parentPart.startsWith("WH")) {
      finalSort = 4; // Open PO
    } else if (demand > 0) {
      finalSort = 2; // Demand
    } else if (parentPart.startsWith("WH")) {
      finalSort = 1; // Inventory (first row, QOH record)
    } else {
      finalSort = 2; // Default to demand
    }

    rows.push({
      vendor,
      component,
      description: raw["Description"]?.trim() || "",
      parentPart,
      date,
      qoh,
      // Demand: new format has positive values, convert to negative for internal consistency
      demand: finalSort === 2 && demand > 0 ? -demand : 0,
      openOrders: finalSort === 4 ? openOrders : 0,
      // Net: use "Net & Orders" as the running net position
      net: netAndOrders,
      runTotal: 0, // Not available in new format
      finalSort,
      index: idx,
      stdCost,
      extendedCost: 0, // Not available in new format
    });
  });

  return rows;
}
