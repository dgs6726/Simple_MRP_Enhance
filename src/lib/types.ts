/** Raw row from the CSV export */
export interface MrpDetailRow {
  vendor: string;
  component: string;
  description: string;
  parentPart: string;
  date: string; // ISO date string
  qoh: number;
  demand: number;
  openOrders: number;
  net: number;
  runTotal: number;
  finalSort: number; // 1=Inventory, 2=Demand, 4=Open PO
  index: number;
  stdCost: number;
  extendedCost: number;
}

/** Per-item planning parameters from the lead times file */
export interface LeadTimeData {
  component: string;
  description: string;
  annualDemand: number;
  weeklyDemand: number;
  stdCost: number;
  leadTimeWeeks: number;
  soq: number;
  avgReceiptQty: number;
  ltDemand: number;
  safetyStock: number;
  min: number;
  max: number;
  average: number;
  minDollars: number;
  maxDollars: number;
  avgDollars: number;
  primaryCustomer: string;
  primaryCustomerPct: number;
  totalCustomerCount: number;
}

/** Weekly bucket for a single item */
export interface WeeklyBucket {
  weekStart: string; // ISO date (Monday)
  netPosition: number; // ending net position for the week
  totalDemand: number;
  totalSupply: number;
}

/** Summary row for an item (computed from detail rows) */
export interface MrpItem {
  component: string;
  description: string;
  abcClass: "A" | "B" | "C";
  stdCost: number;
  qoh: number;
  weeklyReq: number;
  minStock: number;
  safetyStock: number;
  stdOrdQty: number;
  maxStock: number;
  weeksOfSupply: number;
  leadTimeWeeks: number;
  leadTimeHorizon: string; // ISO date = snapshotDate + leadTimeWeeks
  firstShortageDate: string | null;
  shortageQty: number;
  hasOpenPo: boolean;
  primaryCustomer: string;
  primaryCustomerPct: number;
  weeks: WeeklyBucket[];
  detail: MrpDetailRow[];
  exceptions: ExceptionFlag[];
  actions: RecommendedAction[];
}

export type ExceptionFlag =
  | "SHORTAGE"           // net < 0 within lead time
  | "PLANNING_SHORTAGE"  // net < 0 outside lead time (time to act)
  | "BELOW_MIN"          // net < min within lead time
  | "ABOVE_MAX"          // net > max (overstocked)
  | "NO_COVERAGE"        // no PO and weeks of supply < lead time
  | "EXCESS";            // net > max for 4+ consecutive weeks

export type ActionType =
  | "PLACE_ORDER"
  | "PULL_IN_PO"
  | "PUSH_OUT_PO"
  | "INCREASE_PO"
  | "REDUCE_PO"
  | "CANCEL_PO";

export interface RecommendedAction {
  type: ActionType;
  urgency: "critical" | "warning" | "info";
  summary: string;
  detail: string;
  daysUntilImpact: number;
  suggestedQty?: number;
  suggestedDate?: string;
  relatedPo?: string;
  relatedVendor?: string;
}

/** A parsed + computed snapshot of MRP data */
export interface MrpSnapshot {
  id: string;
  snapshotDate: string;
  uploadedAt: string;
  branch: number;
  rowCount: number;
  items: MrpItem[];
}
