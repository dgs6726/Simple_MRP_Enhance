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

/** Compute weekly buckets for an item's detail rows */
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

/** Generate recommended actions for an item */
function computeActions(
  item: {
    component: string;
    weeks: WeeklyBucket[];
    detail: MrpDetailRow[];
    minStock: number;
    maxStock: number;
    soq: number;
    leadTimeWeeks: number;
    leadTimeHorizon: string;
    weeklyReq: number;
  },
  snapshotDate: string
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const { weeks, detail, minStock, maxStock, soq, leadTimeHorizon, weeklyReq } = item;

  const poRows = detail.filter((d) => d.finalSort === 4);
  const withinLT = weeks.filter((w) => w.weekStart <= leadTimeHorizon);
  const allWeeksSorted = [...weeks].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  // Find first week where net goes below min within lead time
  const firstBelowMin = withinLT.find(
    (w) => w.netPosition < minStock && minStock > 0
  );

  // Find first shortage (any time horizon)
  const firstShortage = allWeeksSorted.find((w) => w.netPosition < 0);

  // Find first week above max
  const firstAboveMax = allWeeksSorted.find(
    (w) => maxStock > 0 && w.netPosition > maxStock
  );

  // PLACE ORDER: will go below min within LT, no PO covers it
  if (firstBelowMin) {
    const days = daysBetween(snapshotDate, firstBelowMin.weekStart);
    const gap = minStock - firstBelowMin.netPosition;
    const orderQty = soq > 0 ? Math.ceil(gap / soq) * soq : gap;

    // Check if any PO arrives before the problem
    const coveringPo = poRows.find(
      (po) => po.date <= firstBelowMin.weekStart && po.openOrders > 0
    );

    if (!coveringPo) {
      actions.push({
        type: "PLACE_ORDER",
        urgency: firstBelowMin.netPosition < 0 ? "critical" : "warning",
        summary: `Place order for ${orderQty.toLocaleString()} units`,
        detail: `Inventory drops to ${firstBelowMin.netPosition.toLocaleString()} (min: ${minStock.toLocaleString()}) by week of ${firstBelowMin.weekStart}`,
        daysUntilImpact: days,
        suggestedQty: orderQty,
        suggestedDate: firstBelowMin.weekStart,
      });
    }
  } else if (firstShortage && !firstBelowMin) {
    // Shortage beyond LT but no near-term issue — planning action
    const days = daysBetween(snapshotDate, firstShortage.weekStart);
    const gap = Math.abs(firstShortage.netPosition);
    const orderQty = soq > 0 ? Math.ceil(gap / soq) * soq : gap;
    actions.push({
      type: "PLACE_ORDER",
      urgency: "info",
      summary: `Plan order for ${orderQty.toLocaleString()} units`,
      detail: `Shortage of ${gap.toLocaleString()} projected by week of ${firstShortage.weekStart} (outside lead time)`,
      daysUntilImpact: days,
      suggestedQty: orderQty,
      suggestedDate: firstShortage.weekStart,
    });
  }

  // PULL IN PO: shortage starts before a PO arrives
  if (firstShortage) {
    for (const po of poRows) {
      if (po.date > firstShortage.weekStart && po.openOrders > 0) {
        const days = daysBetween(snapshotDate, firstShortage.weekStart);
        actions.push({
          type: "PULL_IN_PO",
          urgency: firstShortage.weekStart <= leadTimeHorizon ? "critical" : "warning",
          summary: `Pull in PO ${po.parentPart} (${po.openOrders.toLocaleString()} units)`,
          detail: `Shortage starts ${firstShortage.weekStart}, PO arrives ${po.date}. Pull in by ${daysBetween(firstShortage.weekStart, po.date)} days.`,
          daysUntilImpact: days,
          suggestedDate: firstShortage.weekStart,
          relatedPo: po.parentPart,
          relatedVendor: po.vendor,
        });
      }
    }
  }

  // PUSH OUT PO: PO arrives while above max
  if (firstAboveMax) {
    for (const po of poRows) {
      if (po.date <= firstAboveMax.weekStart && po.openOrders > 0) {
        // Check if inventory is above max at PO arrival time
        const poWeek = getWeekStart(po.date);
        const poWeekBucket = weeks.find((w) => w.weekStart === poWeek);
        if (poWeekBucket && poWeekBucket.netPosition > maxStock) {
          const days = daysBetween(snapshotDate, po.date);
          actions.push({
            type: "PUSH_OUT_PO",
            urgency: "info",
            summary: `Push out PO ${po.parentPart} (${po.openOrders.toLocaleString()} units)`,
            detail: `Inventory at ${poWeekBucket.netPosition.toLocaleString()} (max: ${maxStock.toLocaleString()}) when PO ${po.parentPart} arrives ${po.date}`,
            daysUntilImpact: days,
            relatedPo: po.parentPart,
            relatedVendor: po.vendor,
          });
        }
      }
    }
  }

  // REDUCE PO: open PO qty will push well above max
  for (const po of poRows) {
    const poWeek = getWeekStart(po.date);
    const poWeekBucket = weeks.find((w) => w.weekStart === poWeek);
    if (poWeekBucket && maxStock > 0) {
      const overage = poWeekBucket.netPosition - maxStock;
      if (overage > po.openOrders * 0.5) {
        actions.push({
          type: "REDUCE_PO",
          urgency: "info",
          summary: `Reduce PO ${po.parentPart} by ~${overage.toLocaleString()} units`,
          detail: `PO of ${po.openOrders.toLocaleString()} pushes inventory to ${poWeekBucket.netPosition.toLocaleString()} (max: ${maxStock.toLocaleString()})`,
          daysUntilImpact: daysBetween(snapshotDate, po.date),
          suggestedQty: Math.max(0, po.openOrders - overage),
          relatedPo: po.parentPart,
          relatedVendor: po.vendor,
        });
      }
    }
  }

  // Sort by urgency then days until impact
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

    const weeklyReq = lt
      ? lt.weeklyDemand
      : Math.round(
          demandRows.reduce((sum, r) => sum + Math.abs(r.demand), 0) /
            Math.max(weeks.length, 1)
        );

    const leadTimeWeeks = lt?.leadTimeWeeks || 6; // default 6 weeks
    const soq = lt?.soq || 0;
    const safetyStock = lt?.safetyStock || 0;
    const minStock = lt?.min || safetyStock || weeklyReq;
    const maxStock = lt?.max || minStock + soq;
    const primaryCustomer = lt?.primaryCustomer || "";
    const primaryCustomerPct = lt?.primaryCustomerPct || 0;

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
        component: comp,
        weeks,
        detail: sortedDetail,
        minStock,
        maxStock,
        soq,
        leadTimeWeeks,
        leadTimeHorizon,
        weeklyReq,
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
