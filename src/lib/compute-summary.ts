import type {
  MrpDetailRow,
  MrpItem,
  MrpSnapshot,
  WeeklyBucket,
  ExceptionFlag,
} from "./types";

/** Get the Monday of the ISO week for a given date string */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

/** Group detail rows by component */
function groupByComponent(
  rows: MrpDetailRow[]
): Map<string, MrpDetailRow[]> {
  const map = new Map<string, MrpDetailRow[]>();
  for (const row of rows) {
    if (!row.component) continue;
    const existing = map.get(row.component);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.component, [row]);
    }
  }
  return map;
}

/** Compute weekly buckets for an item's detail rows */
function computeWeeklyBuckets(rows: MrpDetailRow[]): WeeklyBucket[] {
  const weekMap = new Map<
    string,
    { netPosition: number; totalDemand: number; totalSupply: number }
  >();

  // Sort rows by date then index
  const sorted = [...rows].sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    return dc !== 0 ? dc : a.index - b.index;
  });

  for (const row of sorted) {
    if (!row.date) continue;
    const ws = getWeekStart(row.date);
    const existing = weekMap.get(ws) || {
      netPosition: 0,
      totalDemand: 0,
      totalSupply: 0,
    };

    // Net position = last net value in the week (running)
    existing.netPosition = row.net;
    existing.totalDemand += row.demand; // demand is negative
    existing.totalSupply += row.openOrders;

    weekMap.set(ws, existing);
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => ({
      weekStart,
      netPosition: data.netPosition,
      totalDemand: data.totalDemand,
      totalSupply: data.totalSupply,
    }));
}

/** Compute ABC classification for all items */
function computeAbcClasses(
  itemMap: Map<string, { extCost60Day: number }>
): Map<string, "A" | "B" | "C"> {
  const items = Array.from(itemMap.entries())
    .map(([comp, data]) => ({ component: comp, extCost: data.extCost60Day }))
    .sort((a, b) => b.extCost - a.extCost);

  const totalCost = items.reduce((sum, i) => sum + i.extCost, 0);
  const result = new Map<string, "A" | "B" | "C">();

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.extCost;
    const pct = totalCost > 0 ? cumulative / totalCost : 1;
    if (pct <= 0.8) {
      result.set(item.component, "A");
    } else if (pct <= 0.95) {
      result.set(item.component, "B");
    } else {
      result.set(item.component, "C");
    }
  }

  return result;
}

/** Compute exception flags for an item */
function computeExceptions(
  weeks: WeeklyBucket[],
  minStock: number,
  maxStock: number,
  hasOpenPo: boolean,
  weeksOfSupply: number
): ExceptionFlag[] {
  const flags: ExceptionFlag[] = [];

  if (weeks.some((w) => w.netPosition < 0)) {
    flags.push("SHORTAGE");
  }

  if (weeks.some((w) => w.netPosition > 0 && w.netPosition < minStock)) {
    flags.push("BELOW_MIN");
  }

  if (!hasOpenPo && weeksOfSupply < 4) {
    flags.push("NO_COVERAGE");
  }

  // EXCESS: net > maxStock for 4+ consecutive weeks
  if (maxStock > 0) {
    let consecutive = 0;
    for (const w of weeks) {
      if (w.netPosition > maxStock) {
        consecutive++;
        if (consecutive >= 4) {
          flags.push("EXCESS");
          break;
        }
      } else {
        consecutive = 0;
      }
    }
  }

  return flags;
}

/** Build the full snapshot from parsed CSV rows */
export function buildSnapshot(
  rows: MrpDetailRow[],
  branch: number = 2
): MrpSnapshot {
  const grouped = groupByComponent(rows);
  const snapshotDate =
    rows.find((r) => r.finalSort === 1)?.date || new Date().toISOString().split("T")[0];

  // Compute 60-day extended cost for ABC classification
  const snapshotDateObj = new Date(snapshotDate + "T00:00:00");
  const sixtyDaysOut = new Date(snapshotDateObj);
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
  const sixtyDayStr = sixtyDaysOut.toISOString().split("T")[0];

  const abcData = new Map<string, { extCost60Day: number }>();
  for (const [comp, compRows] of grouped) {
    const demandRows = compRows.filter(
      (r) => r.finalSort === 2 && r.date >= snapshotDate && r.date <= sixtyDayStr
    );
    const totalDemand = demandRows.reduce(
      (sum, r) => sum + Math.abs(r.demand),
      0
    );
    const stdCost = compRows[0]?.stdCost || 0;
    abcData.set(comp, { extCost60Day: totalDemand * stdCost });
  }

  const abcClasses = computeAbcClasses(abcData);

  // Build MrpItem for each component
  const items: MrpItem[] = [];

  for (const [comp, compRows] of grouped) {
    const inventoryRow = compRows.find((r) => r.finalSort === 1);
    const demandRows = compRows.filter((r) => r.finalSort === 2);
    const poRows = compRows.filter((r) => r.finalSort === 4);

    const qoh = inventoryRow?.qoh || 0;
    const stdCost = inventoryRow?.stdCost || compRows[0]?.stdCost || 0;
    const description =
      inventoryRow?.description || compRows[0]?.description || "";

    // Weekly requirement: total absolute demand / number of weeks spanned
    const weeks = computeWeeklyBuckets(compRows);
    const totalAbsDemand = demandRows.reduce(
      (sum, r) => sum + Math.abs(r.demand),
      0
    );
    const numWeeks = Math.max(weeks.length, 1);
    const weeklyReq = Math.round(totalAbsDemand / numWeeks);

    const minStock = weeklyReq; // default: 1 week
    const stdOrdQty = 0; // default: no standard order qty
    const maxStock = minStock + stdOrdQty;

    const weeksOfSupply = weeklyReq > 0 ? qoh / weeklyReq : Infinity;

    // First shortage
    const shortageWeek = weeks.find((w) => w.netPosition < 0);
    const firstShortageDate = shortageWeek?.weekStart || null;
    const shortageQty = shortageWeek
      ? Math.abs(shortageWeek.netPosition)
      : 0;

    const hasOpenPo = poRows.length > 0;

    const exceptions = computeExceptions(
      weeks,
      minStock,
      maxStock,
      hasOpenPo,
      weeksOfSupply
    );

    items.push({
      component: comp,
      description,
      abcClass: abcClasses.get(comp) || "C",
      stdCost,
      qoh,
      weeklyReq,
      minStock,
      stdOrdQty,
      maxStock,
      weeksOfSupply,
      firstShortageDate,
      shortageQty,
      hasOpenPo,
      weeks,
      detail: compRows.sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        return dc !== 0 ? dc : a.index - b.index;
      }),
      exceptions,
    });
  }

  // Sort by worst net position (most critical first)
  items.sort((a, b) => {
    const aMin = Math.min(...a.weeks.map((w) => w.netPosition));
    const bMin = Math.min(...b.weeks.map((w) => w.netPosition));
    return aMin - bMin;
  });

  return {
    id: crypto.randomUUID(),
    snapshotDate,
    uploadedAt: new Date().toISOString(),
    branch,
    rowCount: rows.length,
    items,
  };
}
