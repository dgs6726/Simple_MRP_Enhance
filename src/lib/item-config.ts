/**
 * Persistent item configuration store.
 * Keyed by branch, stores planning parameters per item.
 * Persists in localStorage independently of snapshots.
 * Upload creates initial config; user can edit inline;
 * future uploads selectively merge chosen fields.
 */
import type { LeadTimeData } from "./types";

export interface ItemConfig {
  component: string;
  description: string;
  leadTimeWeeks: number;
  soq: number;
  safetyStock: number;
  min: number;
  max: number;
  weeklyDemand: number;
  stdCost: number;
  lastSupplierNum: string;
  lastSupplierName: string;
  primaryCustomer: string;
  primaryCustomerPct: number;
  /** Tracks which fields were manually edited by the user */
  userEdited: string[];
}

/** Fields that can be selectively overwritten on upload */
export const MERGEABLE_FIELDS = [
  { key: "leadTimeWeeks", label: "Lead Time" },
  { key: "soq", label: "SOQ" },
  { key: "safetyStock", label: "Safety Stock" },
  { key: "min", label: "Min" },
  { key: "max", label: "Max" },
  { key: "weeklyDemand", label: "Weekly Demand" },
  { key: "stdCost", label: "Std Cost" },
  { key: "lastSupplierNum", label: "Supplier #" },
  { key: "lastSupplierName", label: "Supplier Name" },
  { key: "primaryCustomer", label: "Primary Customer" },
  { key: "primaryCustomerPct", label: "Customer %" },
] as const;

export type MergeableField = (typeof MERGEABLE_FIELDS)[number]["key"];

const CONFIG_PREFIX = "mrp_item_config_branch_";
const SETTINGS_KEY = "mrp_upload_settings";

export interface UploadSettings {
  excludePkg: boolean;
}

function storageKey(branch: number): string {
  return `${CONFIG_PREFIX}${branch}`;
}

/** Get all item configs for a branch */
export function getItemConfigs(branch: number): Map<string, ItemConfig> {
  if (typeof window === "undefined") return new Map();
  const raw = localStorage.getItem(storageKey(branch));
  if (!raw) return new Map();
  try {
    const arr: ItemConfig[] = JSON.parse(raw);
    const map = new Map<string, ItemConfig>();
    for (const item of arr) {
      map.set(item.component, item);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Save all item configs for a branch */
export function saveItemConfigs(
  branch: number,
  configs: Map<string, ItemConfig>
): void {
  const arr = Array.from(configs.values());
  localStorage.setItem(storageKey(branch), JSON.stringify(arr));
}

/** Check if configs exist for a branch */
export function hasItemConfigs(branch: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(storageKey(branch)) !== null;
}

/** Convert LeadTimeData to ItemConfig */
function leadTimeToConfig(lt: LeadTimeData): ItemConfig {
  return {
    component: lt.component,
    description: lt.description,
    leadTimeWeeks: lt.leadTimeWeeks,
    soq: lt.soq,
    safetyStock: lt.safetyStock,
    min: lt.min,
    max: lt.max,
    weeklyDemand: lt.weeklyDemand,
    stdCost: lt.stdCost,
    lastSupplierNum: lt.lastSupplierNum,
    lastSupplierName: lt.lastSupplierName,
    primaryCustomer: lt.primaryCustomer,
    primaryCustomerPct: lt.primaryCustomerPct,
    userEdited: [],
  };
}

/**
 * Initialize configs from lead time data (first upload).
 * Overwrites everything.
 */
export function initConfigsFromUpload(
  branch: number,
  leadTimes: Map<string, LeadTimeData>
): void {
  const configs = new Map<string, ItemConfig>();
  for (const [comp, lt] of leadTimes) {
    configs.set(comp, leadTimeToConfig(lt));
  }
  saveItemConfigs(branch, configs);
}

/**
 * Merge uploaded lead time data into existing configs.
 * Only overwrites the specified fields.
 * Preserves user-edited fields unless explicitly selected.
 */
export function mergeConfigsFromUpload(
  branch: number,
  leadTimes: Map<string, LeadTimeData>,
  fieldsToOverwrite: MergeableField[]
): { updated: number; added: number } {
  const configs = getItemConfigs(branch);
  let updated = 0;
  let added = 0;

  for (const [comp, lt] of leadTimes) {
    const existing = configs.get(comp);
    if (!existing) {
      // New item — add full config
      configs.set(comp, leadTimeToConfig(lt));
      added++;
    } else {
      // Existing item — only overwrite selected fields
      const newConfig = leadTimeToConfig(lt);
      for (const field of fieldsToOverwrite) {
        // Skip if user manually edited this field (unless they chose to overwrite)
        (existing as unknown as Record<string, unknown>)[field] = (
          newConfig as unknown as Record<string, unknown>
        )[field];
        // Remove from userEdited since it's been overwritten by upload
        existing.userEdited = existing.userEdited.filter((f) => f !== field);
      }
      // Always update description
      existing.description = newConfig.description;
      configs.set(comp, existing);
      updated++;
    }
  }

  saveItemConfigs(branch, configs);
  return { updated, added };
}

/** Update a single field on a single item config */
export function updateItemConfig(
  branch: number,
  component: string,
  field: string,
  value: number | string
): void {
  const configs = getItemConfigs(branch);
  const config = configs.get(component);
  if (!config) return;

  (config as unknown as Record<string, unknown>)[field] = value;

  // Track that this field was manually edited
  if (!config.userEdited.includes(field)) {
    config.userEdited.push(field);
  }

  configs.set(component, config);
  saveItemConfigs(branch, configs);
}

/** Convert item configs back to LeadTimeData map for use in buildSnapshot */
export function configsToLeadTimeMap(
  configs: Map<string, ItemConfig>
): Map<string, LeadTimeData> {
  const map = new Map<string, LeadTimeData>();
  for (const [comp, cfg] of configs) {
    map.set(comp, {
      component: cfg.component,
      description: cfg.description,
      annualDemand: cfg.weeklyDemand * 52,
      weeklyDemand: cfg.weeklyDemand,
      stdCost: cfg.stdCost,
      leadTimeWeeks: cfg.leadTimeWeeks,
      soq: cfg.soq,
      avgReceiptQty: 0,
      ltDemand: cfg.weeklyDemand * cfg.leadTimeWeeks,
      safetyStock: cfg.safetyStock,
      min: cfg.min,
      max: cfg.max,
      average: (cfg.min + cfg.max) / 2,
      minDollars: cfg.min * cfg.stdCost,
      maxDollars: cfg.max * cfg.stdCost,
      avgDollars: ((cfg.min + cfg.max) / 2) * cfg.stdCost,
      primaryCustomer: cfg.primaryCustomer,
      primaryCustomerPct: cfg.primaryCustomerPct,
      totalCustomerCount: 0,
      lastSupplierNum: cfg.lastSupplierNum,
      lastSupplierName: cfg.lastSupplierName,
    });
  }
  return map;
}

/** Get upload settings */
export function getUploadSettings(): UploadSettings {
  if (typeof window === "undefined") return { excludePkg: true };
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { excludePkg: true };
  try {
    return JSON.parse(raw);
  } catch {
    return { excludePkg: true };
  }
}

/** Save upload settings */
export function saveUploadSettings(settings: UploadSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
