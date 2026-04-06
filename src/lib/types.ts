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
  stdOrdQty: number;
  maxStock: number;
  weeksOfSupply: number;
  firstShortageDate: string | null;
  shortageQty: number;
  hasOpenPo: boolean;
  weeks: WeeklyBucket[];
  detail: MrpDetailRow[];
  exceptions: ExceptionFlag[];
}

export type ExceptionFlag = "SHORTAGE" | "BELOW_MIN" | "NO_COVERAGE" | "EXCESS";

/** A parsed + computed snapshot of MRP data */
export interface MrpSnapshot {
  id: string;
  snapshotDate: string;
  uploadedAt: string;
  branch: number;
  rowCount: number;
  items: MrpItem[];
}
