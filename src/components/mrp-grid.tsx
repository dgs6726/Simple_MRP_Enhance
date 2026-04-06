"use client";

import {
  useState,
  useMemo,
  useCallback,
  memo,
  useRef,
  useEffect,
} from "react";
import type { MrpItem, ExceptionFlag } from "@/lib/types";
import { fmt, fmtWeekWithNum, fmtCurrency } from "@/lib/format";
import { SparkBar } from "./spark-bar";
import { DetailPanel } from "./detail-panel";

const ABC_COLORS: Record<string, string> = {
  A: "bg-cm-red",
  B: "bg-amber-500",
  C: "bg-cm-gray-med",
};

function cellColorClass(
  val: number,
  min: number,
  max: number,
  isWithinLT: boolean
): { bg: string; text: string } {
  if (!isWithinLT) {
    if (val < 0) return { bg: "bg-red-100", text: "text-red-400" };
    return { bg: "", text: "text-gray-300" };
  }
  if (val < 0) return { bg: "bg-cm-red", text: "text-white" };
  if (min > 0 && val < min)
    return { bg: "bg-cm-amber-bg", text: "text-amber-800" };
  if (max > 0 && val > max) return { bg: "bg-blue-50", text: "text-blue-700" };
  return { bg: "", text: "text-cm-charcoal" };
}

/** Hook to debounce a value */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Compute excess $ for an item: max(0, current_net - max) * stdCost */
function computeExcessDollars(item: MrpItem): number {
  if (item.maxStock <= 0) return 0;
  // Use the first week's net position (current state)
  const currentNet = item.weeks.length > 0 ? item.weeks[0].netPosition : item.qoh;
  const excess = Math.max(0, currentNet - item.maxStock);
  return excess * item.stdCost;
}

const COL_COUNT = 9; // fixed columns before weekly data

const MrpRow = memo(function MrpRow({
  item,
  allWeeks,
  ltBoundaryIndex,
  isExpanded,
  onToggle,
}: {
  item: MrpItem;
  allWeeks: string[];
  ltBoundaryIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasShortage = item.exceptions.includes("SHORTAGE");
  const weekMap = useMemo(
    () => new Map(item.weeks.map((w) => [w.weekStart, w])),
    [item.weeks]
  );

  const excessDollars = useMemo(() => computeExcessDollars(item), [item]);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b transition-colors ${
          isExpanded
            ? "bg-gray-100 border-gray-200"
            : hasShortage
              ? "bg-cm-red/[0.03] border-gray-100 hover:bg-gray-50"
              : "border-gray-100 hover:bg-gray-50"
        }`}
      >
        <td className="py-2 px-2 pl-6 font-semibold font-mono text-[11px] whitespace-nowrap sticky left-0 bg-inherit z-[5]">
          <span className="mr-1.5 text-[8px] text-cm-gray-light">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
          {item.component}
        </td>
        <td className="py-2 px-2 text-cm-gray-med whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] sticky left-[90px] bg-inherit z-[5]">
          {item.description}
        </td>
        <td className="py-2 px-2 text-center">
          <span
            className={`inline-block w-5 h-[18px] leading-[18px] rounded text-[10px] font-bold text-white text-center ${ABC_COLORS[item.abcClass] || "bg-gray-400"}`}
          >
            {item.abcClass}
          </span>
        </td>
        <td className="py-2 px-2 text-right font-mono font-medium text-[11px]">
          {fmt(item.qoh)}
        </td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med">
          {item.leadTimeWeeks}w
        </td>
        <td className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med">
          {fmt(item.minStock)}
        </td>
        <td className={`py-2 px-2 text-right font-mono text-[11px] ${excessDollars > 0 ? "text-blue-700 font-semibold" : "text-gray-200"}`}>
          {excessDollars > 0 ? fmtCurrency(excessDollars) : "\u2014"}
        </td>
        <td className="py-2 px-2 text-center">
          <SparkBar
            weeks={item.weeks}
            minStock={item.minStock}
            leadTimeHorizon={item.leadTimeHorizon}
          />
        </td>
        {allWeeks.map((ws, idx) => {
          const bucket = weekMap.get(ws);
          const isWithinLT = idx <= ltBoundaryIndex;
          const isLtBoundary = idx === ltBoundaryIndex;

          if (!bucket) {
            return (
              <td
                key={ws}
                className={`py-1.5 px-1.5 text-right font-mono text-[11px] border-l border-black/[0.04] ${
                  isWithinLT ? "text-cm-gray-light" : "text-gray-200"
                } ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`}
              >
                &mdash;
              </td>
            );
          }
          const c = cellColorClass(
            bucket.netPosition,
            item.minStock,
            item.maxStock,
            isWithinLT
          );
          return (
            <td
              key={ws}
              className={`py-1.5 px-1.5 text-right font-mono text-[11px] whitespace-nowrap border-l border-black/[0.04] ${c.bg} ${c.text} ${
                bucket.netPosition < 0 && isWithinLT ? "font-bold" : ""
              } ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`}
            >
              {fmt(bucket.netPosition)}
            </td>
          );
        })}
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan={COL_COUNT + allWeeks.length}
            className="p-0"
          >
            {/* Constrain detail panel to viewport width, not table width */}
            <div className="sticky left-0 w-screen max-w-[100vw]">
              <DetailPanel item={item} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

interface MrpGridProps {
  items: MrpItem[];
  snapshotDate: string;
}

export function MrpGrid({ items, snapshotDate }: MrpGridProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [abcFilter, setAbcFilter] = useState<string | null>(null);
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFlag | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [hidePkg, setHidePkg] = useState(true);

  // Debounce search inputs for performance
  const search = useDebouncedValue(searchInput, 200);
  const supplierFilter = useDebouncedValue(supplierInput, 200);

  const baseFiltered = useMemo(() => {
    let d = items;
    if (hidePkg) d = d.filter((i) => !i.component.startsWith("PKG"));
    if (abcFilter) d = d.filter((i) => i.abcClass === abcFilter);
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (i) =>
          i.component.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s)
      );
    }
    if (supplierFilter) {
      const s = supplierFilter.toLowerCase();
      d = d.filter(
        (i) =>
          i.lastSupplierName.toLowerCase().includes(s) ||
          i.lastSupplierNum.toLowerCase().includes(s)
      );
    }
    return d;
  }, [items, abcFilter, search, supplierFilter, hidePkg]);

  const shortageCount = baseFiltered.filter((i) =>
    i.exceptions.includes("SHORTAGE")
  ).length;
  const planningShortageCount = baseFiltered.filter(
    (i) =>
      i.exceptions.includes("PLANNING_SHORTAGE") &&
      !i.exceptions.includes("SHORTAGE")
  ).length;
  const belowMinCount = baseFiltered.filter((i) =>
    i.exceptions.includes("BELOW_MIN")
  ).length;
  const aboveMaxCount = baseFiltered.filter((i) =>
    i.exceptions.includes("ABOVE_MAX")
  ).length;

  const filtered = useMemo(() => {
    if (!exceptionFilter) return baseFiltered;
    return baseFiltered.filter((i) => i.exceptions.includes(exceptionFilter));
  }, [baseFiltered, exceptionFilter]);

  const allWeeks = useMemo(() => {
    const weekSet = new Set<string>();
    items.forEach((item) =>
      item.weeks.forEach((w) => weekSet.add(w.weekStart))
    );
    return Array.from(weekSet).sort();
  }, [items]);

  const ltBoundaryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      let lastIdx = -1;
      for (let i = 0; i < allWeeks.length; i++) {
        if (allWeeks[i] <= item.leadTimeHorizon) lastIdx = i;
        else break;
      }
      map.set(item.component, lastIdx);
    }
    return map;
  }, [items, allWeeks]);

  const handleToggle = useCallback((component: string) => {
    setExpanded((prev) => (prev === component ? null : component));
  }, []);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-gray-200 flex items-center gap-2 bg-[#FAFAFA] flex-wrap shrink-0">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search item..."
          className="px-3 py-1.5 border border-gray-300 rounded text-sm w-40 outline-none focus:border-cm-gray-med"
        />
        <input
          value={supplierInput}
          onChange={(e) => setSupplierInput(e.target.value)}
          placeholder="Filter by supplier..."
          className="px-3 py-1.5 border border-gray-300 rounded text-sm w-44 outline-none focus:border-cm-gray-med"
        />

        <div className="flex gap-1">
          {(["A", "B", "C"] as const).map((abc) => (
            <button
              key={abc}
              onClick={() => setAbcFilter(abcFilter === abc ? null : abc)}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                abcFilter === abc
                  ? `${ABC_COLORS[abc]} text-white`
                  : "border border-gray-300 bg-white hover:bg-gray-50"
              }`}
              style={
                abcFilter !== abc
                  ? {
                      color:
                        abc === "A"
                          ? "#C52026"
                          : abc === "B"
                            ? "#D4812A"
                            : "#4D4D4D",
                    }
                  : undefined
              }
            >
              {abc}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-300" />

        <button
          onClick={() =>
            setExceptionFilter(
              exceptionFilter === "SHORTAGE" ? null : "SHORTAGE"
            )
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            exceptionFilter === "SHORTAGE"
              ? "bg-cm-red text-white"
              : "border border-gray-300 bg-white text-cm-red hover:bg-gray-50"
          }`}
        >
          Shortages ({shortageCount})
        </button>
        <button
          onClick={() =>
            setExceptionFilter(
              exceptionFilter === "PLANNING_SHORTAGE"
                ? null
                : "PLANNING_SHORTAGE"
            )
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            exceptionFilter === "PLANNING_SHORTAGE"
              ? "bg-orange-500 text-white"
              : "border border-gray-300 bg-white text-orange-500 hover:bg-gray-50"
          }`}
        >
          Future ({planningShortageCount})
        </button>
        <button
          onClick={() =>
            setExceptionFilter(
              exceptionFilter === "BELOW_MIN" ? null : "BELOW_MIN"
            )
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            exceptionFilter === "BELOW_MIN"
              ? "bg-cm-amber text-white"
              : "border border-gray-300 bg-white text-amber-600 hover:bg-gray-50"
          }`}
        >
          Below Min ({belowMinCount})
        </button>
        <button
          onClick={() =>
            setExceptionFilter(
              exceptionFilter === "ABOVE_MAX" ? null : "ABOVE_MAX"
            )
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            exceptionFilter === "ABOVE_MAX"
              ? "bg-blue-600 text-white"
              : "border border-gray-300 bg-white text-blue-600 hover:bg-gray-50"
          }`}
        >
          Over Max ({aboveMaxCount})
        </button>

        <div className="w-px h-5 bg-gray-300" />

        <label className="flex items-center gap-1.5 text-[11px] text-cm-gray-med cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hidePkg}
            onChange={(e) => setHidePkg(e.target.checked)}
            className="accent-cm-red w-3.5 h-3.5"
          />
          Hide PKG
        </label>

        <div className="ml-auto text-xs text-cm-gray-light">
          {filtered.length} of {items.length} items
        </div>
      </div>

      {/* Scrollable grid container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] sticky top-0 z-10">
              <th className="py-2 px-2 pl-6 text-left font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap sticky left-0 bg-[#F9FAFB] z-20 min-w-[90px]">
                Item
              </th>
              <th className="py-2 px-2 text-left font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider sticky left-[90px] bg-[#F9FAFB] z-20 min-w-[170px]">
                Description
              </th>
              <th className="py-2 px-2 text-center font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider w-8">
                ABC
              </th>
              <th className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap">
                QOH
              </th>
              <th className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap">
                LT
              </th>
              <th className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap">
                Min
              </th>
              <th className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap">
                Excess $
              </th>
              <th className="py-2 px-2 text-center font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider">
                Trend
              </th>
              {allWeeks.map((w) => (
                <th
                  key={w}
                  className="py-1.5 px-1 text-right font-medium text-cm-gray-med text-[10px] whitespace-nowrap min-w-[68px]"
                >
                  <div>{fmtWeekWithNum(w, snapshotDate)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <MrpRow
                key={item.component}
                item={item}
                allWeeks={allWeeks}
                ltBoundaryIndex={ltBoundaryMap.get(item.component) ?? -1}
                isExpanded={expanded === item.component}
                onToggle={() => handleToggle(item.component)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-cm-gray-light">
            No items match the current filters.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-2.5 border-t border-gray-200 flex gap-5 text-[11px] text-cm-gray-light flex-wrap shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cm-red inline-block" />
          Shortage (in LT)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" />
          Shortage (future)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cm-amber-bg border border-amber-300 inline-block" />
          Below Min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-300 inline-block" />
          Above Max
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 border-r-2 border-r-cm-charcoal/30 inline-block" />
          Lead time boundary
        </span>
        <span className="ml-auto">
          Click any row to expand &middot; Dimmed = beyond lead time
        </span>
      </div>
    </div>
  );
}
