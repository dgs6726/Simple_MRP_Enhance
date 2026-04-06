import Papa from "papaparse";
import type { MrpDetailRow } from "./types";

function parseNum(val: string | undefined | null): number {
  if (
    val == null ||
    val === "" ||
    val === "#N/A" ||
    val === "#VALUE!" ||
    val === "#DIV/0!"
  )
    return 0;
  const n = parseFloat(val.replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Convert Excel serial date number to ISO date string */
function excelSerialToDate(serial: number): string {
  if (!serial || serial < 1000) return ""; // filter out non-date values
  const msPerDay = 86400000;
  const d = new Date((serial - 25569) * msPerDay);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function parseDate(val: string | undefined | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export interface ParseResult {
  rows: MrpDetailRow[];
  snapshotDate: string;
}

/**
 * Detect which CSV format and parse accordingly.
 * Returns parsed rows and the snapshot/run date.
 */
export function parseMrpCsv(csvText: string): ParseResult {
  const lines = csvText.split("\n");
  const firstLine = lines[0] || "";

  // New format v2: has metadata header starting with "Version"
  if (firstLine.startsWith("Version")) {
    return parseNewFormatV2(lines);
  }

  // New format v1: has "Net & Orders" / "LastReceipt" but no metadata header
  if (firstLine.includes("Net & Orders") || firstLine.includes("LastReceipt")) {
    return {
      rows: parseNewFormatV1(csvText),
      snapshotDate: "", // will be derived from data
    };
  }

  // Old format
  return {
    rows: parseOldFormat(csvText),
    snapshotDate: "", // will be derived from data
  };
}

/** Parse old "Detailed MRP" export */
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

/** Parse new format v1 (no metadata header, data headers on row 1) */
function parseNewFormatV1(csvText: string): MrpDetailRow[] {
  const lines = csvText.split("\n");
  if (lines.length < 3) return [];
  // Skip type-hint row (row 2)
  const cleanedCsv = [lines[0], ...lines.slice(2)].join("\n");
  return parseNewFormatRows(cleanedCsv);
}

/** Parse new format v2 (metadata header on rows 1-2, data headers on row 3) */
function parseNewFormatV2(lines: string[]): ParseResult {
  if (lines.length < 5) return { rows: [], snapshotDate: "" };

  // Row 1: Version,,,,,,Date,Buffer,...
  // Row 2: 2,,,,,,46114,30,...
  const metaRow = Papa.parse(lines[1], { header: false }).data[0] as string[];
  const runDateSerial = parseNum(metaRow?.[6]); // column 7 = Date
  const snapshotDate = excelSerialToDate(runDateSerial);

  // Data starts at row 3 (headers) + row 4 (type hints) + row 5 (data)
  // Skip rows 0-1 (metadata) and row 3 (type hints = index 3)
  const cleanedCsv = [lines[2], ...lines.slice(4)].join("\n");
  let rows = parseNewFormatRows(cleanedCsv);

  // Collapse past-due rows into the run date
  if (snapshotDate) {
    rows = collapsePastDueRows(rows, snapshotDate);
  }

  return { rows, snapshotDate };
}

/** Shared row parser for both new format variants */
function parseNewFormatRows(csvText: string): MrpDetailRow[] {
  const result = Papa.parse(csvText, {
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
    if (!date) return; // skip rows with invalid dates

    const qoh = parseNum(raw["QOH"]);
    const netAndOrders = parseNum(raw["Net & Orders"]);
    const stdCost = parseNum(raw["Net"]); // "Net" column = unit cost in new format
    const vendor = raw["Vendor"]?.trim() || "";

    // Derive row type
    let finalSort: number;
    if (openOrders > 0 && parentPart.startsWith("WH")) {
      finalSort = 4; // Open PO
    } else if (demand > 0) {
      finalSort = 2; // Demand
    } else if (parentPart.startsWith("WH") && openOrders === 0 && demand === 0) {
      finalSort = 1; // Inventory
    } else {
      finalSort = 2;
    }

    rows.push({
      vendor,
      component,
      description: raw["Description"]?.trim() || "",
      parentPart,
      date,
      qoh,
      demand: finalSort === 2 && demand > 0 ? -demand : 0,
      openOrders: finalSort === 4 ? openOrders : 0,
      net: netAndOrders,
      runTotal: 0,
      finalSort,
      index: idx,
      stdCost,
      extendedCost: 0,
    });
  });

  return rows;
}

/**
 * Collapse past-due transactions into the run date.
 * For each item, any demand/PO rows dated before the run date
 * get their date shifted to the run date. This keeps the economic
 * impact (past-due orders still count) without creating old columns.
 * Inventory rows (finalSort=1) always get set to the run date.
 */
function collapsePastDueRows(
  rows: MrpDetailRow[],
  runDate: string
): MrpDetailRow[] {
  return rows.map((row) => {
    if (row.date < runDate) {
      return { ...row, date: runDate };
    }
    return row;
  });
}
