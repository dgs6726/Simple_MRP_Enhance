"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
} from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import { parseMrpCsv } from "@/lib/parse-csv";
import { buildSnapshot } from "@/lib/compute-summary";
import {
  getSnapshots,
  saveSnapshot,
  setActiveSnapshotId,
  getActiveSnapshotId,
  deleteSnapshot,
} from "@/lib/store";
import { fmtDateLong } from "@/lib/format";
import type { MrpSnapshot } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [snapshots, setSnapshots] = useState<MrpSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    items: number;
    rows: number;
  } | null>(null);

  useEffect(() => {
    setSnapshots(getSnapshots());
    setActiveId(getActiveSnapshotId());
  }, []);

  const handleFileAccepted = (text: string, fileName: string) => {
    setIsProcessing(true);
    setLastResult(null);

    // Use setTimeout to let the UI update before heavy processing
    setTimeout(() => {
      try {
        const rows = parseMrpCsv(text);
        const snapshot = buildSnapshot(rows, 2);
        saveSnapshot(snapshot);
        setSnapshots(getSnapshots());
        setActiveId(snapshot.id);
        setLastResult({ items: snapshot.items.length, rows: snapshot.rowCount });
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
            Import your Detailed MRP export CSV
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Upload Zone */}
        <UploadZone
          onFileAccepted={handleFileAccepted}
          isProcessing={isProcessing}
        />

        {/* Success message */}
        {lastResult && (
          <div className="mt-4 bg-cm-green-bg border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cm-green shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-green-800">
                Upload successful.
              </span>{" "}
              <span className="text-green-700">
                {lastResult.items} items from {lastResult.rows.toLocaleString()}{" "}
                rows processed.
              </span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="ml-auto text-xs font-semibold text-cm-green hover:text-green-700 transition-colors"
            >
              View Dashboard &rarr;
            </button>
          </div>
        )}

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
