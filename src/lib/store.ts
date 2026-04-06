/**
 * Simple client-side store for MRP snapshots and lead time data.
 * Uses localStorage so data persists across page navigations.
 * Will be replaced by Supabase in the full version.
 */
import type { MrpSnapshot, LeadTimeData, MrpDetailRow } from "./types";

const STORAGE_KEY = "mrp_snapshots";
const ACTIVE_KEY = "mrp_active_snapshot";
const LEAD_TIMES_KEY = "mrp_lead_times";
const RAW_ROWS_KEY = "mrp_raw_rows";

export function getSnapshots(): MrpSnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSnapshot(snapshot: MrpSnapshot): void {
  // Only keep last 5 snapshots to avoid localStorage limits
  const existing = getSnapshots().slice(0, 4);
  existing.unshift(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  setActiveSnapshotId(snapshot.id);
}

export function getActiveSnapshotId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveSnapshotId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveSnapshot(): MrpSnapshot | null {
  const snapshots = getSnapshots();
  const activeId = getActiveSnapshotId();
  if (activeId) {
    return snapshots.find((s) => s.id === activeId) || snapshots[0] || null;
  }
  return snapshots[0] || null;
}

export function deleteSnapshot(id: string): void {
  const snapshots = getSnapshots().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  if (getActiveSnapshotId() === id) {
    const next = snapshots[0];
    if (next) setActiveSnapshotId(next.id);
    else localStorage.removeItem(ACTIVE_KEY);
  }
}

/** Store lead time data as a serializable array */
export function saveLeadTimes(data: Map<string, LeadTimeData>): void {
  const arr = Array.from(data.values());
  localStorage.setItem(LEAD_TIMES_KEY, JSON.stringify(arr));
}

/** Retrieve lead time data as a Map */
export function getLeadTimes(): Map<string, LeadTimeData> | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(LEAD_TIMES_KEY);
  if (!raw) return undefined;
  try {
    const arr: LeadTimeData[] = JSON.parse(raw);
    const map = new Map<string, LeadTimeData>();
    for (const item of arr) {
      map.set(item.component, item);
    }
    return map;
  } catch {
    return undefined;
  }
}

export function hasLeadTimes(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LEAD_TIMES_KEY) !== null;
}

/** Store raw parsed MRP rows so we can re-process without re-uploading */
export function saveRawRows(rows: MrpDetailRow[]): void {
  localStorage.setItem(RAW_ROWS_KEY, JSON.stringify(rows));
}

export function getRawRows(): MrpDetailRow[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RAW_ROWS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasRawRows(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(RAW_ROWS_KEY) !== null;
}
