import type {
  MrpDetailRow,
  MrpItem,
  MrpSnapshot,
  WeeklyBucket,
  ExceptionFlag,
  LeadTimeData,
  RecommendedAction,
} from "./types";

/** Get the Monday of the ISO week for a given date string */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

/** Add weeks to a date string */
function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

/** Days between two ISO date strings */
function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** Group detail rows by component */
function groupByComponent(rows: MrpDetailRow[]): Map<string, MrpDetailRow[]> {
  const map = new Map<string, MrpDetailRow[]>();
  for (const row of rows) {
    if (!row.component) continue;
    const existing = map.get(row.component);
    if (existing) existing.push(row);
    else map.set(row.component, [row]);
  }
  return map;
}

/** Compute weekly buckets for an item's detail rows, filling gaps with carry-forward */
function computeWeeklyBuckets(rows: MrpDetailRow[]): WeeklyBucket[] {
  const weekMap = new Map<
    string,
    { netPosition: number; totalDemand: number; totalSupply: number }
  >();

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
    existing.netPosition = row.net;
    existing.totalDemand += row.demand;
    existing.totalSupply += row.openOrders;
    weekMap.set(ws, existing);
  }

  // Sort the weeks that have data
  const sortedWeeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  if (sortedWeeks.length < 2) {
    return sortedWeeks.map(([weekStart, data]) => ({
      weekStart,
      netPosition: data.netPosition,
      totalDemand: data.totalDemand,
      totalSupply: data.totalSupply,
    }));
  }

  // Fill gaps: generate every week from first to last, carry forward net position
  const firstWeek = sortedWeeks[0][0];
  const lastWeek = sortedWeeks[sortedWeeks.length - 1][0];
  const result: WeeklyBucket[] = [];
  let currentWeek = firstWeek;
  let lastNet = sortedWeeks[0][1].netPosition;

  while (currentWeek <= lastWeek) {
    const data = weekMap.get(currentWeek);
    if (data) {
      lastNet = data.netPosition;
      result.push({
        weekStart: currentWeek,
        netPosition: data.netPosition,
        totalDemand: data.totalDemand,
        totalSupply: data.totalSupply,
      });
    } else {
      // No activity this week — carry forward last net position
      result.push({
        weekStart: currentWeek,
        netPosition: lastNet,
        totalDemand: 0,
        totalSupply: 0,
      });
    }
    // Advance to next Monday
    const d = new Date(currentWeek + "T00:00:00");
    d.setDate(d.getDate() + 7);
    currentWeek = d.toISOString().split("T")[0];
  }

  return result;
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
    if (pct <= 0.8) result.set(item.component, "A");
    else if (pct <= 0.95) result.set(item.component, "B");
    else result.set(item.component, "C");
  }
  return result;
}

/** Compute lead-time-aware exception flags */
function computeExceptions(
  weeks: WeeklyBucket[],
  minStock: number,
  maxStock: number,
  hasOpenPo: boolean,
  weeksOfSupply: number,
  leadTimeHorizon: string,
  leadTimeWeeks: number
): ExceptionFlag[] {
  const flags: ExceptionFlag[] = [];

  const withinLT = weeks.filter((w) => w.weekStart <= leadTimeHorizon);
  const beyondLT = weeks.filter((w) => w.weekStart > leadTimeHorizon);

  // Actionable shortage: negative within lead time
  if (withinLT.some((w) => w.netPosition < 0)) {
    flags.push("SHORTAGE");
  }

  // Planning shortage: negative outside lead time (you have time to act)
  if (beyondLT.some((w) => w.netPosition < 0)) {
    flags.push("PLANNING_SHORTAGE");
  }

  // Below min within lead time
  if (
    minStock > 0 &&
    withinLT.some((w) => w.netPosition > 0 && w.netPosition < minStock)
  ) {
    flags.push("BELOW_MIN");
  }

  // Above max
  if (maxStock > 0 && weeks.some((w) => w.netPosition > maxStock)) {
    flags.push("ABOVE_MAX");
  }

  // No coverage: no PO and weeks of supply < lead time
  if (!hasOpenPo && weeksOfSupply < leadTimeWeeks) {
    flags.push("NO_COVERAGE");
  }

  // Excess: net > maxStock for 4+ consecutive weeks
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

/** Generate simplified recommended actions for an item */
function computeActions(
  item: {
    weeks: WeeklyBucket[];
    detail: MrpDetailRow[];
    minStock: number;
    maxStock: number;
    leadTimeHorizon: string;
  },
  snapshotDate: string
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const { weeks, detail, minStock, maxStock, leadTimeHorizon } = item;

  const poRows = detail.filter((d) => d.finalSort === 4);
  const withinLT = weeks.filter((w) => w.weekStart <= leadTimeHorizon);
  const allWeeksSorted = [...weeks].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  const firstBelowMin = withinLT.find(
    (w) => w.netPosition < minStock && minStock > 0
  );
  const firstShortage = allWeeksSorted.find((w) => w.netPosition < 0);
  const firstAboveMax = allWeeksSorted.find(
    (w) => maxStock > 0 && w.netPosition > maxStock
  );

  // ORDER: inventory will drop below min within LT and no PO covers it
  if (firstBelowMin) {
    const days = daysBetween(snapshotDate, firstBelowMin.weekStart);
    const coveringPo = poRows.find(
      (po) => po.date <= firstBelowMin.weekStart && po.openOrders > 0
    );
    if (!coveringPo) {
      actions.push({
        type: "ORDER",
        urgency: firstBelowMin.netPosition < 0 ? "critical" : "warning",
        summary: `Place orders \u2014 drops below min by ${firstBelowMin.weekStart}`,
        daysUntilImpact: days,
      });
    }
  } else if (firstShortage) {
    actions.push({
      type: "ORDER",
      urgency: "info",
      summary: `Plan future orders \u2014 shortage projected ${firstShortage.weekStart}`,
      daysUntilImpact: daysBetween(snapshotDate, firstShortage.weekStart),
    });
  }

  // MOVE IN: shortage starts before a PO arrives
  if (firstShortage) {
    const latePo = poRows.find(
      (po) => po.date > firstShortage.weekStart && po.openOrders > 0
    );
    if (latePo) {
      actions.push({
        type: "MOVE_IN",
        urgency:
          firstShortage.weekStart <= leadTimeHorizon ? "critical" : "warning",
        summary: `Move in open orders \u2014 shortage starts before PO arrives`,
        daysUntilImpact: daysBetween(snapshotDate, firstShortage.weekStart),
      });
    }
  }

  // MOVE OUT: PO arrives while above max
  if (firstAboveMax && maxStock > 0) {
    const earlyPo = poRows.find((po) => {
      const poWeek = getWeekStart(po.date);
      const bucket = weeks.find((w) => w.weekStart === poWeek);
      return bucket && bucket.netPosition > maxStock && po.openOrders > 0;
    });
    if (earlyPo) {
      actions.push({
        type: "MOVE_OUT",
        urgency: "info",
        summary: `Push out orders \u2014 inventory above max at arrival`,
        daysUntilImpact: daysBetween(snapshotDate, earlyPo.date),
      });
    }
  }

  // REDUCE: consistently above max
  if (
    maxStock > 0 &&
    withinLT.length > 0 &&
    withinLT.every((w) => w.netPosition > maxStock)
  ) {
    actions.push({
      type: "REDUCE",
      urgency: "info",
      summary: `Reduce orders \u2014 inventory stays above max through lead time`,
      daysUntilImpact: 0,
    });
  }

  const urgencyOrder = { critical: 0, warning: 1, info: 2 };
  actions.sort(
    (a, b) =>
      urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
      a.daysUntilImpact - b.daysUntilImpact
  );

  return actions;
}

/** Build the full snapshot from parsed CSV rows, enriched with lead time data */
export function buildSnapshot(
  rows: MrpDetailRow[],
  branch: number = 2,
  leadTimes?: Map<string, LeadTimeData>
): MrpSnapshot {
  const grouped = groupByComponent(rows);
  const snapshotDate =
    rows.find((r) => r.finalSort === 1)?.date ||
    new Date().toISOString().split("T")[0];

  // Compute 60-day extended cost for ABC classification
  const sixtyDayStr = addWeeks(snapshotDate, 9); // ~60 days

  const abcData = new Map<string, { extCost60Day: number }>();
  for (const [comp, compRows] of grouped) {
    const demandRows = compRows.filter(
      (r) =>
        r.finalSort === 2 && r.date >= snapshotDate && r.date <= sixtyDayStr
    );
    const totalDemand = demandRows.reduce(
      (sum, r) => sum + Math.abs(r.demand),
      0
    );
    const stdCost = compRows[0]?.stdCost || 0;
    abcData.set(comp, { extCost60Day: totalDemand * stdCost });
  }
  const abcClasses = computeAbcClasses(abcData);

  const items: MrpItem[] = [];

  for (const [comp, compRows] of grouped) {
    const inventoryRow = compRows.find((r) => r.finalSort === 1);
    const demandRows = compRows.filter((r) => r.finalSort === 2);
    const poRows = compRows.filter((r) => r.finalSort === 4);

    const qoh = inventoryRow?.qoh || 0;
    const stdCost = inventoryRow?.stdCost || compRows[0]?.stdCost || 0;
    const description =
      inventoryRow?.description || compRows[0]?.description || "";

    const weeks = computeWeeklyBuckets(compRows);

    // Use lead time data if available, otherwise compute defaults
    const lt = leadTimes?.get(comp);

    const weeklyReq = lt != null
      ? lt.weeklyDemand
      : Math.round(
          demandRows.reduce((sum, r) => sum + Math.abs(r.demand), 0) /
            Math.max(weeks.length, 1)
        );

    const leadTimeWeeks = lt != null ? lt.leadTimeWeeks : 6;
    const soq = lt?.soq ?? 0;
    const safetyStock = lt?.safetyStock ?? 0;
    const minStock = lt != null ? lt.min : (safetyStock > 0 ? safetyStock : weeklyReq);
    const maxStock = lt != null ? lt.max : minStock + soq;
    const primaryCustomer = lt?.primaryCustomer ?? "";
    const primaryCustomerPct = lt?.primaryCustomerPct ?? 0;
    const lastSupplierNum = lt?.lastSupplierNum ?? "";
    const lastSupplierName = lt?.lastSupplierName ?? "";

    const weeksOfSupply = weeklyReq > 0 ? qoh / weeklyReq : Infinity;
    const leadTimeHorizon = addWeeks(snapshotDate, leadTimeWeeks);

    // First shortage (within lead time only for the main flag)
    const shortageWeekLT = weeks.find(
      (w) => w.netPosition < 0 && w.weekStart <= leadTimeHorizon
    );
    const shortageWeekAny = weeks.find((w) => w.netPosition < 0);
    const firstShortageDate =
      shortageWeekLT?.weekStart || shortageWeekAny?.weekStart || null;
    const shortageQty = shortageWeekLT
      ? Math.abs(shortageWeekLT.netPosition)
      : shortageWeekAny
        ? Math.abs(shortageWeekAny.netPosition)
        : 0;

    const hasOpenPo = poRows.length > 0;

    const exceptions = computeExceptions(
      weeks,
      minStock,
      maxStock,
      hasOpenPo,
      weeksOfSupply,
      leadTimeHorizon,
      leadTimeWeeks
    );

    const sortedDetail = compRows.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      return dc !== 0 ? dc : a.index - b.index;
    });

    const actions = computeActions(
      {
        weeks,
        detail: sortedDetail,
        minStock,
        maxStock,
        leadTimeHorizon,
      },
      snapshotDate
    );

    items.push({
      component: comp,
      description,
      abcClass: abcClasses.get(comp) || "C",
      stdCost,
      qoh,
      weeklyReq,
      minStock,
      safetyStock,
      stdOrdQty: soq,
      maxStock,
      weeksOfSupply,
      leadTimeWeeks,
      leadTimeHorizon,
      firstShortageDate,
      shortageQty,
      hasOpenPo,
      primaryCustomer,
      primaryCustomerPct,
      lastSupplierNum,
      lastSupplierName,
      weeks,
      detail: sortedDetail,
      exceptions,
      actions,
    });
  }

  // Sort: actionable shortages first, then planning shortages, then by worst position
  items.sort((a, b) => {
    const aHasActionable = a.exceptions.includes("SHORTAGE") ? 0 : 1;
    const bHasActionable = b.exceptions.includes("SHORTAGE") ? 0 : 1;
    if (aHasActionable !== bHasActionable) return aHasActionable - bHasActionable;

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
