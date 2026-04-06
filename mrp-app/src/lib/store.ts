/**
 * Simple client-side store for MRP snapshots.
 * Uses localStorage so data persists across page navigations.
 * Will be replaced by Supabase in the full version.
 */
import type { MrpSnapshot } from "./types";

const STORAGE_KEY = "mrp_snapshots";
const ACTIVE_KEY = "mrp_active_snapshot";

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
  const existing = getSnapshots();
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
    if (next) {
      setActiveSnapshotId(next.id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }
}
