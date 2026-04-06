"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Save, X } from "lucide-react";
import type { ItemConfig } from "@/lib/item-config";
import {
  getItemConfigs,
  updateItemConfig,
} from "@/lib/item-config";
import { fmt } from "@/lib/format";

interface ConfigPanelProps {
  branch: number;
  onConfigChanged: () => void;
}

const EDITABLE_COLUMNS = [
  { key: "leadTimeWeeks", label: "LT (wks)", type: "number" as const, width: 70 },
  { key: "soq", label: "SOQ", type: "number" as const, width: 70 },
  { key: "safetyStock", label: "Safety", type: "number" as const, width: 70 },
  { key: "min", label: "Min", type: "number" as const, width: 70 },
  { key: "max", label: "Max", type: "number" as const, width: 70 },
  { key: "weeklyDemand", label: "Wkly Req", type: "number" as const, width: 70 },
  { key: "stdCost", label: "Std Cost", type: "number" as const, width: 70 },
  { key: "lastSupplierName", label: "Supplier", type: "text" as const, width: 160 },
  { key: "primaryCustomer", label: "Customer", type: "text" as const, width: 160 },
];

interface EditingCell {
  component: string;
  field: string;
  value: string;
}

export function ConfigPanel({ branch, onConfigChanged }: ConfigPanelProps) {
  const [configs, setConfigs] = useState<ItemConfig[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const map = getItemConfigs(branch);
    const arr = Array.from(map.values()).sort((a, b) =>
      a.component.localeCompare(b.component)
    );
    setConfigs(arr);
  }, [branch]);

  const filtered = useMemo(() => {
    if (!search) return configs;
    const s = search.toLowerCase();
    return configs.filter(
      (c) =>
        c.component.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s) ||
        c.lastSupplierName.toLowerCase().includes(s)
    );
  }, [configs, search]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 33,
    overscan: 15,
  });

  const startEdit = useCallback(
    (component: string, field: string, currentValue: number | string) => {
      setEditing({ component, field, value: String(currentValue) });
      setTimeout(() => inputRef.current?.select(), 0);
    },
    []
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const col = EDITABLE_COLUMNS.find((c) => c.key === editing.field);
    if (!col) return;

    const newValue =
      col.type === "number" ? parseFloat(editing.value) || 0 : editing.value;

    updateItemConfig(branch, editing.component, editing.field, newValue);

    // Update local state including userEdited tracking
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.component !== editing.component) return c;
        const userEdited = c.userEdited.includes(editing.field)
          ? c.userEdited
          : [...c.userEdited, editing.field];
        return { ...c, [editing.field]: newValue, userEdited };
      })
    );

    setEditing(null);
    onConfigChanged();
  }, [editing, branch, onConfigChanged]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") cancelEdit();
    },
    [commitEdit, cancelEdit]
  );

  if (configs.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-cm-gray-light text-sm">
        No item configuration loaded. Upload a Lead Times CSV on the Upload page
        to populate planning parameters.
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-gray-200 flex items-center gap-3 bg-[#FAFAFA] shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items, suppliers..."
          className="px-3 py-1.5 border border-gray-300 rounded text-sm w-56 outline-none focus:border-cm-gray-med"
        />
        <div className="text-xs text-cm-gray-light">
          {filtered.length} items &middot; Click any cell to edit &middot;
          Enter to save, Esc to cancel
        </div>
        {editing && (
          <div className="ml-auto flex items-center gap-1 text-xs text-cm-amber">
            <span className="font-medium">
              Editing {editing.component} / {editing.field}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable config grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex bg-[#F9FAFB] sticky top-0 z-10 border-b border-gray-200">
          <div className="py-2 px-2 pl-6 font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider min-w-[100px] shrink-0 sticky left-0 bg-[#F9FAFB] z-20 border-r border-gray-100">
            Item
          </div>
          <div className="py-2 px-2 font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider min-w-[180px] shrink-0 sticky left-[100px] bg-[#F9FAFB] z-20 border-r border-gray-200">
            Description
          </div>
          {EDITABLE_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider shrink-0"
              style={{ minWidth: col.width }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Virtual rows */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filtered[virtualRow.index];
            if (!item) return null;

            return (
              <div
                key={item.component}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex border-b border-gray-100 hover:bg-gray-50">
                  <div className="py-2 px-2 pl-6 font-mono font-semibold text-[11px] min-w-[100px] shrink-0 sticky left-0 bg-white z-[5] border-r border-gray-100">
                    {item.component}
                  </div>
                  <div className="py-2 px-2 text-xs text-cm-gray-med min-w-[180px] shrink-0 whitespace-nowrap overflow-hidden text-ellipsis sticky left-[100px] bg-white z-[5] border-r border-gray-200">
                    {item.description}
                  </div>
                  {EDITABLE_COLUMNS.map((col) => {
                    const raw = (item as unknown as Record<string, unknown>)[col.key];
                    const value =
                      col.type === "number" ? (raw as number) : (raw as string);
                    const isEditing =
                      editing?.component === item.component &&
                      editing?.field === col.key;
                    const isUserEdited = item.userEdited.includes(col.key);

                    if (isEditing) {
                      return (
                        <div
                          key={col.key}
                          className="py-1 px-1 shrink-0"
                          style={{ minWidth: col.width }}
                        >
                          <input
                            ref={inputRef}
                            type={col.type === "number" ? "number" : "text"}
                            value={editing.value}
                            onChange={(e) =>
                              setEditing({ ...editing, value: e.target.value })
                            }
                            onKeyDown={handleKeyDown}
                            onBlur={commitEdit}
                            autoFocus
                            className="w-full px-1.5 py-0.5 border-2 border-cm-red rounded text-[11px] font-mono outline-none text-right"
                            step={col.key === "stdCost" ? "0.01" : "1"}
                          />
                        </div>
                      );
                    }

                    const displayValue =
                      col.type === "number"
                        ? col.key === "stdCost"
                          ? `$${(value as number).toFixed(2)}`
                          : fmt(value as number)
                        : (value as string) || "\u2014";

                    return (
                      <div
                        key={col.key}
                        onClick={() => startEdit(item.component, col.key, value)}
                        className={`py-2 px-2 text-right font-mono text-[11px] cursor-pointer shrink-0 hover:bg-cm-amber-bg/50 transition-colors ${
                          isUserEdited
                            ? "text-cm-red font-semibold"
                            : col.type === "text"
                              ? "text-cm-gray-med text-left"
                              : "text-cm-charcoal"
                        }`}
                        style={{ minWidth: col.width }}
                        title={
                          isUserEdited
                            ? "Manually edited"
                            : "Click to edit"
                        }
                      >
                        {displayValue}
                        {isUserEdited && (
                          <span className="text-[8px] text-cm-red ml-0.5">
                            *
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2.5 border-t border-gray-200 flex gap-4 text-[11px] text-cm-gray-light shrink-0">
        <span>
          <span className="text-cm-red font-semibold">Red*</span> = manually
          edited (preserved on upload unless overwritten)
        </span>
        <span className="ml-auto">
          Changes save automatically &middot; Re-upload Lead Times CSV to bulk
          update
        </span>
      </div>
    </div>
  );
}
