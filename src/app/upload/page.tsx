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
  saveRawRows,
} from "@/lib/store";
import {
  hasItemConfigs,
  initConfigsFromUpload,
  mergeConfigsFromUpload,
  getItemConfigs,
  configsToLeadTimeMap,
  getUploadSettings,
  saveUploadSettings,
  MERGEABLE_FIELDS,
  type MergeableField,
} from "@/lib/item-config";
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
    added: number;
    updated: number;
  } | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const [excludePkg, setExcludePkg] = useState(true);

  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingLeadTimes, setPendingLeadTimes] = useState<Map<
    string,
    import("@/lib/types").LeadTimeData
  > | null>(null);
  const [selectedFields, setSelectedFields] = useState<
    Set<MergeableField>
  >(new Set(MERGEABLE_FIELDS.map((f) => f.key)));

  useEffect(() => {
    setSnapshots(getSnapshots());
    setActiveId(getActiveSnapshotId());
    setHasConfig(hasItemConfigs(2));
    const settings = getUploadSettings();
    setExcludePkg(settings.excludePkg);
  }, []);

  const handleLeadTimesAccepted = (text: string) => {
    const data = parseLeadTimesCsv(text);

    if (hasConfig) {
      // Existing config — show merge dialog
      setPendingLeadTimes(data);
      setShowMergeDialog(true);
    } else {
      // First time — just initialize
      setIsProcessingLT(true);
      setTimeout(() => {
        try {
          initConfigsFromUpload(2, data);
          setHasConfig(true);
          setLtResult({ count: data.size, added: data.size, updated: 0 });
        } catch (err) {
          console.error("Failed to process lead times:", err);
        } finally {
          setIsProcessingLT(false);
        }
      }, 50);
    }
  };

  const handleMergeConfirm = () => {
    if (!pendingLeadTimes) return;
    setIsProcessingLT(true);
    setShowMergeDialog(false);
    setTimeout(() => {
      try {
        const fieldsArr = Array.from(selectedFields);
        const result = mergeConfigsFromUpload(2, pendingLeadTimes, fieldsArr);
        setHasConfig(true);
        setLtResult({
          count: pendingLeadTimes.size,
          added: result.added,
          updated: result.updated,
        });
      } catch (err) {
        console.error("Failed to merge lead times:", err);
      } finally {
        setIsProcessingLT(false);
        setPendingLeadTimes(null);
      }
    }, 50);
  };

  const handleMrpAccepted = (text: string) => {
    setIsProcessing(true);
    setLastResult(null);
    saveUploadSettings({ excludePkg });

    setTimeout(() => {
      try {
        let rows = parseMrpCsv(text);

        // Pre-filter PKG items at build time
        if (excludePkg) {
          rows = rows.filter((r) => !r.component.startsWith("PKG"));
        }

        // Use item configs as the source of truth for planning parameters
        const configs = getItemConfigs(2);
        const leadTimes =
          configs.size > 0 ? configsToLeadTimeMap(configs) : undefined;

        // Save raw rows for re-processing when config changes
        saveRawRows(rows);

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

  const toggleField = (field: MergeableField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
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
        {/* Step 1: Planning Parameters */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-cm-charcoal text-white text-xs font-bold flex items-center justify-center">
              1
            </div>
            <h2 className="text-sm font-semibold text-cm-charcoal">
              Planning Parameters
              {hasConfig && (
                <span className="ml-2 text-xs font-normal text-cm-green">
                  (configured)
                </span>
              )}
            </h2>
            <Settings2 className="w-4 h-4 text-cm-gray-light" />
          </div>
          <p className="text-xs text-cm-gray-light mb-3 ml-8">
            Upload your Lead Times / SOQs CSV.{" "}
            {hasConfig
              ? "Config exists \u2014 you'll choose which fields to update."
              : "First upload creates the item configuration."}
            {" "}Edit individual values on the Item Config tab.
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
                {ltResult.added > 0 && `${ltResult.added} items added. `}
                {ltResult.updated > 0 && `${ltResult.updated} items updated. `}
                {ltResult.count} total items in file.
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

          {/* Settings */}
          <div className="ml-8 mb-3 flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-cm-gray-med cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludePkg}
                onChange={(e) => setExcludePkg(e.target.checked)}
                className="accent-cm-red w-3.5 h-3.5"
              />
              Exclude PKG items (packaging/totes)
            </label>
          </div>

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

      {/* Merge Dialog Overlay */}
      {showMergeDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-base font-bold text-cm-charcoal mb-1">
              Update Planning Parameters
            </h3>
            <p className="text-xs text-cm-gray-light mb-4">
              Item configuration already exists. Select which fields should be
              overwritten by this upload. Uncheck fields you want to keep at
              their current values (including manual edits).
            </p>

            <div className="space-y-2 mb-5">
              {MERGEABLE_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    onChange={() => toggleField(field.key)}
                    className="accent-cm-red w-4 h-4"
                  />
                  <span className="text-cm-charcoal">{field.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowMergeDialog(false);
                  setPendingLeadTimes(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-cm-gray-med hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Select all
                  setSelectedFields(
                    new Set(MERGEABLE_FIELDS.map((f) => f.key))
                  );
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-cm-gray-med hover:bg-gray-50 cursor-pointer"
              >
                All
              </button>
              <button
                onClick={() => setSelectedFields(new Set())}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-cm-gray-med hover:bg-gray-50 cursor-pointer"
              >
                None
              </button>
              <button
                onClick={handleMergeConfirm}
                className="flex-1 px-4 py-2 bg-cm-red text-white rounded-lg text-sm font-semibold hover:bg-cm-red/90 cursor-pointer"
              >
                Update {selectedFields.size} Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
