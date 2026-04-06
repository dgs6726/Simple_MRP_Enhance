"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  LayoutGrid,
  ListChecks,
  Settings,
} from "lucide-react";
import { getActiveSnapshot } from "@/lib/store";
import { fmtCurrency, fmtDateLong } from "@/lib/format";
import { MrpGrid } from "@/components/mrp-grid";
import { ActionsPanel } from "@/components/actions-panel";
import { ConfigPanel } from "@/components/config-panel";
import type { MrpSnapshot } from "@/lib/types";

const BRANCH_NAMES: Record<number, string> = {
  2: "Rochester",
  5: "Shelbyville",
  3: "Pulaski",
};

type ViewTab = "grid" | "actions" | "config";

export default function DashboardPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<MrpSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("grid");

  useEffect(() => {
    const active = getActiveSnapshot();
    setSnapshot(active);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-cm-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-cm-charcoal px-6 py-4 flex items-center gap-3">
          <div className="w-1.5 h-7 bg-cm-red rounded-sm" />
          <h1 className="text-white text-lg font-bold tracking-tight">
            Material Requirements Planning
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-cm-gray-bg/60 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-cm-gray-light" />
            </div>
            <h2 className="text-lg font-semibold text-cm-charcoal mb-1">
              No MRP data loaded
            </h2>
            <p className="text-sm text-cm-gray-light mb-5">
              Upload your planning parameters and MRP export CSV to get started.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="px-5 py-2.5 bg-cm-red text-white text-sm font-semibold rounded-lg hover:bg-cm-red/90 transition-colors cursor-pointer"
            >
              Upload Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shortageCount = snapshot.items.filter((i) =>
    i.exceptions.includes("SHORTAGE")
  ).length;
  const totalExposure = snapshot.items
    .filter((i) => i.exceptions.includes("SHORTAGE"))
    .reduce((sum, i) => {
      const withinLT = i.weeks.filter((w) => w.weekStart <= i.leadTimeHorizon);
      const minNet = withinLT.length > 0
        ? Math.min(...withinLT.map((w) => w.netPosition))
        : 0;
      return sum + (minNet < 0 ? Math.abs(minNet) * i.stdCost : 0);
    }, 0);
  const totalActions = snapshot.items.reduce(
    (sum, i) => sum + i.actions.length,
    0
  );
  const criticalActions = snapshot.items.reduce(
    (sum, i) =>
      sum + i.actions.filter((a) => a.urgency === "critical").length,
    0
  );
  const totalExcess = snapshot.items.reduce((sum, i) => {
    if (i.maxStock <= 0 || i.component.startsWith("PKG")) return sum;
    const currentNet = i.weeks.length > 0 ? i.weeks[0].netPosition : i.qoh;
    const excess = Math.max(0, currentNet - i.maxStock);
    return sum + excess * i.stdCost;
  }, 0);
  const totalInventoryValue = snapshot.items.reduce((sum, i) => {
    if (i.component.startsWith("PKG")) return sum;
    return sum + i.qoh * i.stdCost;
  }, 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-cm-charcoal px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 bg-cm-red rounded-sm" />
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight">
              Material Requirements Planning
            </h1>
            <p className="text-cm-gray-light text-xs">
              Branch {snapshot.branch} &mdash;{" "}
              {BRANCH_NAMES[snapshot.branch] || "Unknown"} &middot; As of{" "}
              {fmtDateLong(snapshot.snapshotDate)}{" "}
              &middot; <span className="text-cm-gray-med">v0.8.0</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Summary stats */}
          <div className="text-center">
            <div
              className={`text-2xl font-bold font-mono ${shortageCount > 0 ? "text-red-400" : "text-cm-green"}`}
            >
              {shortageCount}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Shortages
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-cm-amber">
              {fmtCurrency(totalExposure)}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Shortage $
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <div className="text-center">
            <div className={`text-2xl font-bold font-mono ${totalExcess > 0 ? "text-blue-400" : "text-white"}`}>
              {fmtCurrency(totalExcess)}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Excess $
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <div className="text-center">
            <div
              className={`text-2xl font-bold font-mono ${criticalActions > 0 ? "text-red-400" : "text-white"}`}
            >
              {totalActions}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Actions
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-white">
              {fmtCurrency(totalInventoryValue)}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Inventory
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-white">
              {snapshot.items.length}
            </div>
            <div className="text-cm-gray-light text-[10px] uppercase tracking-wider">
              Items
            </div>
          </div>
          <div className="w-px h-8 bg-cm-gray-med" />
          <button
            onClick={() => router.push("/upload")}
            className="px-3 py-1.5 bg-cm-gray-med/60 hover:bg-cm-gray-med text-white text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "grid"
              ? "border-cm-red text-cm-charcoal"
              : "border-transparent text-cm-gray-light hover:text-cm-gray-med"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          MRP Grid
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "actions"
              ? "border-cm-red text-cm-charcoal"
              : "border-transparent text-cm-gray-light hover:text-cm-gray-med"
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Recommended Actions
          {criticalActions > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cm-red text-white text-[9px] font-bold">
              {criticalActions}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "config"
              ? "border-cm-red text-cm-charcoal"
              : "border-transparent text-cm-gray-light hover:text-cm-gray-med"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Item Config
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === "grid" ? (
          <MrpGrid items={snapshot.items} snapshotDate={snapshot.snapshotDate} />
        ) : activeTab === "actions" ? (
          <ActionsPanel items={snapshot.items} />
        ) : (
          <ConfigPanel
            branch={snapshot.branch}
            onConfigChanged={() => {
              // Reload snapshot to reflect config changes
              // (user would need to re-upload MRP to fully recalculate)
            }}
          />
        )}
      </div>
    </div>
  );
}
