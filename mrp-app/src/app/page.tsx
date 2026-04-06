"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { getActiveSnapshot } from "@/lib/store";
import { fmtCurrency, fmtDateLong } from "@/lib/format";
import { MrpGrid } from "@/components/mrp-grid";
import type { MrpSnapshot } from "@/lib/types";

const BRANCH_NAMES: Record<number, string> = {
  2: "Rochester",
  5: "Shelbyville",
  3: "Pulaski",
};

export default function DashboardPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<MrpSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

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
              Upload your Detailed MRP export CSV to get started.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="px-5 py-2.5 bg-cm-red text-white text-sm font-semibold rounded-lg hover:bg-cm-red/90 transition-colors cursor-pointer"
            >
              Upload CSV
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
      const minNet = Math.min(...i.weeks.map((w) => w.netPosition));
      return sum + (minNet < 0 ? Math.abs(minNet) * i.stdCost : 0);
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
              {fmtDateLong(snapshot.snapshotDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
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
              Exposure
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

      {/* Grid */}
      <div className="flex-1">
        <MrpGrid items={snapshot.items} />
      </div>
    </div>
  );
}
