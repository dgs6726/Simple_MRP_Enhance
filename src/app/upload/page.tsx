"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Settings2,
} from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import { parseMrpCsv } from "@/lib/parse-csv";
import { parseLeadTimesCsv } from "@/lib/parse-lead-times";
import { buildSnapshot } from "@/lib/compute-summary";
import {
  getSnapshots,
  saveSnapshot,
  setActiveSnapshotId,
  getActiveSnapshotId,
  deleteSnapshot,
  saveLeadTimes,
  getLeadTimes,
  hasLeadTimes,
} from "@/lib/store";
import { fmtDateLong } from "@/lib/format";
import type { MrpSnapshot } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingLT, setIsProcessingLT] = useState(false);
  const [snapshots, setSnapshots] = useState<MrpSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    items: number;
    rows: number;
    actions: number;
  } | null>(null);
  const [ltResult, setLtResult] = useState<{
    count: number;
  } | null>(null);
  const [hasLT, setHasLT] = useState(false);

  useEffect(() => {
    setSnapshots(getSnapshots());
    setActiveId(getActiveSnapshotId());
    setHasLT(hasLeadTimes());
  }, []);

  const handleLeadTimesAccepted = (text: string) => {
    setIsProcessingLT(true);
    setLtResult(null);
    setTimeout(() => {
      try {
        const data = parseLeadTimesCsv(text);
        saveLeadTimes(data);
        setHasLT(true);
        setLtResult({ count: data.size });
      } catch (err) {
        console.error("Failed to parse lead times:", err);
      } finally {
        setIsProcessingLT(false);
      }
    }, 50);
  };

  const handleMrpAccepted = (text: string) => {
    setIsProcessing(true);
    setLastResult(null);
    setTimeout(() => {
      try {
        const rows = parseMrpCsv(text);
        const leadTimes = getLeadTimes();
        const snapshot = buildSnapshot(rows, 2, leadTimes);
        saveSnapshot(snapshot);
        setSnapshots(getSnapshots());
        setActiveId(snapshot.id);
        const totalActions = snapshot.items.reduce(
          (sum, i) => sum + i.actions.length,
          0
        );
        setLastResult({
          items: snapshot.items.length,
          rows: snapshot.rowCount,
          actions: totalActions,
        });
      } catch (err) {
        console.error("Failed to process CSV:", err);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleSetActive = (id: string) => {
    setActiveSnapshotId(id);
    setActiveId(id);
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    setSnapshots(getSnapshots());
    setActiveId(getActiveSnapshotId());
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-cm-charcoal px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="text-cm-gray-light hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-1.5 h-7 bg-cm-red rounded-sm" />
        <div>
          <h1 className="text-white text-lg font-bold tracking-tight">
            Upload MRP Data
          </h1>
          <p className="text-cm-gray-light text-xs">
            Import your planning data files
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Step 1: Lead Times */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-cm-charcoal text-white text-xs font-bold flex items-center justify-center">
              1
            </div>
            <h2 className="text-sm font-semibold text-cm-charcoal">
              Planning Parameters
              {hasLT && (
                <span className="ml-2 text-xs font-normal text-cm-green">
                  (loaded)
                </span>
              )}
            </h2>
            <Settings2 className="w-4 h-4 text-cm-gray-light" />
          </div>
          <p className="text-xs text-cm-gray-light mb-3 ml-8">
            Upload your Lead Times / SOQs CSV. This provides Min, Max, Safety
            Stock, Lead Time, SOQ, and customer data per item.{" "}
            {hasLT
              ? "Already loaded \u2014 re-upload to update."
              : "Upload this first for the best experience."}
          </p>
          <div className="ml-8">
            <UploadZone
              onFileAccepted={handleLeadTimesAccepted}
              isProcessing={isProcessingLT}
              compact
              label="Drop Lead Times CSV here"
            />
          </div>
          {ltResult && (
            <div className="ml-8 mt-2 bg-cm-green-bg border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cm-green shrink-0" />
              <span className="text-xs text-green-700">
                Loaded planning parameters for {ltResult.count} items.
              </span>
            </div>
          )}
        </div>

        {/* Step 2: MRP Export */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-cm-charcoal text-white text-xs font-bold flex items-center justify-center">
              2
            </div>
            <h2 className="text-sm font-semibold text-cm-charcoal">
              MRP Export
            </h2>
            <FileSpreadsheet className="w-4 h-4 text-cm-gray-light" />
          </div>
          <p className="text-xs text-cm-gray-light mb-3 ml-8">
            Upload the Detailed MRP export CSV from Excel.
          </p>
          <div className="ml-8">
            <UploadZone
              onFileAccepted={handleMrpAccepted}
              isProcessing={isProcessing}
              label="Drop MRP export CSV here"
            />
          </div>
          {lastResult && (
            <div className="ml-8 mt-2 bg-cm-green-bg border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cm-green shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-green-800">
                  Upload successful.
                </span>{" "}
                <span className="text-green-700">
                  {lastResult.items} items, {lastResult.rows.toLocaleString()}{" "}
                  rows, {lastResult.actions} recommended actions.
                </span>
              </div>
              <button
                onClick={() => router.push("/")}
                className="ml-auto text-xs font-semibold text-cm-green hover:text-green-700 transition-colors whitespace-nowrap"
              >
                View Dashboard &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Snapshot History */}
        {snapshots.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-cm-charcoal uppercase tracking-wider mb-3">
              Upload History
            </h2>
            <div className="border border-cm-gray-bg rounded-lg divide-y divide-cm-gray-bg">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <FileSpreadsheet className="w-4 h-4 text-cm-gray-light shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-cm-charcoal">
                      Branch {snap.branch} &mdash;{" "}
                      {fmtDateLong(snap.snapshotDate)}
                    </div>
                    <div className="text-xs text-cm-gray-light flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(snap.uploadedAt).toLocaleString()} &middot;{" "}
                      {snap.items.length} items &middot;{" "}
                      {snap.rowCount.toLocaleString()} rows
                    </div>
                  </div>
                  {activeId === snap.id ? (
                    <span className="text-xs font-semibold text-cm-green bg-cm-green-bg px-2.5 py-1 rounded">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(snap.id)}
                      className="text-xs font-medium text-cm-gray-light hover:text-cm-charcoal transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(snap.id)}
                    className="text-cm-gray-light hover:text-cm-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
