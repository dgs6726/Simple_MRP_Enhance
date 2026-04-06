"use client";

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  startTransition,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function computeExcessDollars(item: MrpItem): number {
  if (item.maxStock <= 0) return 0;
  const currentNet =
    item.weeks.length > 0 ? item.weeks[0].netPosition : item.qoh;
  const excess = Math.max(0, currentNet - item.maxStock);
  return excess * item.stdCost;
}

const COL_COUNT = 11;
const ROW_HEIGHT = 33;
const EXPANDED_HEIGHT = 400;
const MIN_ROW_WIDTH_PX = 75;
const WEEK_COL_PX = 68;

function renderRow(
  item: MrpItem,
  allWeeks: string[],
  ltBoundaryIndex: number,
  isExpanded: boolean,
  onToggle: () => void
) {
  const hasShortage = item.exceptions.includes("SHORTAGE");
  const excessDollars = computeExcessDollars(item);
  // Explicit bg for sticky columns so they don't show through
  const stickyBg = isExpanded
    ? "bg-gray-100"
    : hasShortage
      ? "bg-[#fef8f8]"
      : "bg-white";

  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex cursor-pointer border-b hover:bg-gray-50 ${
          isExpanded
            ? "bg-gray-100 border-gray-200"
            : hasShortage
              ? "bg-[#fef8f8] border-gray-100"
              : "bg-white border-gray-100"
        }`}
        style={{ minWidth: `${COL_COUNT * MIN_ROW_WIDTH_PX + allWeeks.length * WEEK_COL_PX}px` }}
      >
        {/* Sticky Item — opaque bg + right border */}
        <div className={`py-2 px-2 pl-6 font-semibold font-mono text-[11px] whitespace-nowrap sticky left-0 z-[5] min-w-[90px] shrink-0 ${stickyBg} border-r border-gray-100`}>
          <span className="mr-1.5 text-[8px] text-cm-gray-light">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
          {item.component}
        </div>
        {/* Sticky Description — opaque bg + right border */}
        <div className={`py-2 px-2 text-cm-gray-med whitespace-nowrap overflow-hidden text-ellipsis min-w-[170px] max-w-[180px] shrink-0 sticky left-[90px] z-[5] text-xs ${stickyBg} border-r border-gray-200`}>
          {item.description}
        </div>
        <div className="py-2 px-2 text-center min-w-[40px] shrink-0">
          <span
            className={`inline-block w-5 h-[18px] leading-[18px] rounded text-[10px] font-bold text-white text-center ${ABC_COLORS[item.abcClass] || "bg-gray-400"}`}
          >
            {item.abcClass}
          </span>
        </div>
        <div className="py-2 px-2 text-right font-mono font-medium text-[11px] min-w-[70px] shrink-0">
          {fmt(item.qoh)}
        </div>
        <div className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med min-w-[35px] shrink-0">
          {item.leadTimeWeeks}w
        </div>
        <div className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med min-w-[60px] shrink-0">
          {fmt(item.minStock)}
        </div>
        <div className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med min-w-[60px] shrink-0">
          {fmt(item.maxStock)}
        </div>
        <div
          className={`py-2 px-2 text-right font-mono text-[11px] min-w-[60px] shrink-0 ${excessDollars > 0 ? "text-blue-700 font-semibold" : "text-gray-200"}`}
        >
          {excessDollars > 0 ? fmtCurrency(excessDollars) : "\u2014"}
        </div>
        <div className="py-2 px-2 text-center min-w-[55px] shrink-0">
          <SparkBar
            weeks={item.weeks}
            minStock={item.minStock}
            leadTimeHorizon={item.leadTimeHorizon}
          />
        </div>
        {allWeeks.map((ws, idx) => {
          const isWithinLT = idx <= ltBoundaryIndex;
          const isLtBoundary = idx === ltBoundaryIndex;

          let netPosition: number | null = null;
          for (const w of item.weeks) {
            if (w.weekStart === ws) {
              netPosition = w.netPosition;
              break;
            }
          }

          if (netPosition === null) {
            return (
              <div
                key={ws}
                className={`py-1.5 px-1.5 text-right font-mono text-[11px] border-l border-black/[0.04] min-w-[68px] shrink-0 ${
                  isWithinLT ? "text-cm-gray-light" : "text-gray-200"
                } ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`}
              >
                &mdash;
              </div>
            );
          }
          const c = cellColorClass(
            netPosition,
            item.minStock,
            item.maxStock,
            isWithinLT
          );
          return (
            <div
              key={ws}
              className={`py-1.5 px-1.5 text-right font-mono text-[11px] whitespace-nowrap border-l border-black/[0.04] min-w-[68px] shrink-0 ${c.bg} ${c.text} ${
                netPosition < 0 && isWithinLT ? "font-bold" : ""
              } ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`}
            >
              {fmt(netPosition)}
            </div>
          );
        })}
      </div>
      {isExpanded && (
        <div className="sticky left-0 w-screen max-w-[100vw]">
          <DetailPanel item={item} />
        </div>
      )}
    </div>
  );
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const search = useDebouncedValue(searchInput, 200);
  const supplierFilter = useDebouncedValue(supplierInput, 200);

  const setHidePkgTransition = useCallback((val: boolean) => {
    startTransition(() => setHidePkg(val));
  }, []);
  const setAbcFilterTransition = useCallback((val: string | null) => {
    startTransition(() => setAbcFilter(val));
  }, []);
  const setExceptionFilterTransition = useCallback(
    (val: ExceptionFlag | null) => {
      startTransition(() => setExceptionFilter(val));
    },
    []
  );

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

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      expanded === filtered[index]?.component ? EXPANDED_HEIGHT : ROW_HEIGHT,
    overscan: 10,
  });

  const handleToggle = useCallback((component: string) => {
    setExpanded((prev) => (prev === component ? null : component));
  }, []);

  const headerMinWidth = `${COL_COUNT * MIN_ROW_WIDTH_PX + allWeeks.length * WEEK_COL_PX}px`;

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
              onClick={() =>
                setAbcFilterTransition(abcFilter === abc ? null : abc)
              }
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
            setExceptionFilterTransition(
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
            setExceptionFilterTransition(
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
            setExceptionFilterTransition(
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
            setExceptionFilterTransition(
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
            onChange={(e) => setHidePkgTransition(e.target.checked)}
            className="accent-cm-red w-3.5 h-3.5"
          />
          Hide PKG
        </label>

        <div className="ml-auto text-xs text-cm-gray-light">
          {filtered.length} of {items.length} items
        </div>
      </div>

      {/* Virtualized scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Header row */}
        <div
          className="flex bg-[#F9FAFB] sticky top-0 z-10 border-b border-gray-200"
          style={{ minWidth: headerMinWidth }}
        >
          <div className="py-2 px-2 pl-6 font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap sticky left-0 bg-[#F9FAFB] z-20 min-w-[90px] shrink-0 border-r border-gray-100">
            Item
          </div>
          <div className="py-2 px-2 font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider sticky left-[90px] bg-[#F9FAFB] z-20 min-w-[170px] shrink-0 border-r border-gray-200">
            Description
          </div>
          <div className="py-2 px-2 text-center font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider min-w-[40px] shrink-0">
            ABC
          </div>
          <div className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap min-w-[70px] shrink-0">
            QOH
          </div>
          <div className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap min-w-[35px] shrink-0">
            LT
          </div>
          <div className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap min-w-[60px] shrink-0">
            Min
          </div>
          <div className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap min-w-[60px] shrink-0">
            Max
          </div>
          <div className="py-2 px-2 text-right font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider whitespace-nowrap min-w-[60px] shrink-0">
            Excess $
          </div>
          <div className="py-2 px-2 text-center font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider min-w-[55px] shrink-0">
            Trend
          </div>
          {allWeeks.map((w) => (
            <div
              key={w}
              className="py-1.5 px-1 text-right font-medium text-cm-gray-med text-[10px] whitespace-nowrap min-w-[68px] shrink-0"
            >
              {fmtWeekWithNum(w, snapshotDate)}
            </div>
          ))}
        </div>

        {/* Virtual rows */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filtered[virtualRow.index];
            if (!item) return null;
            const isExpanded = expanded === item.component;
            return (
              <div
                key={item.component}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
              >
                {renderRow(
                  item,
                  allWeeks,
                  ltBoundaryMap.get(item.component) ?? -1,
                  isExpanded,
                  () => handleToggle(item.component)
                )}
              </div>
            );
          })}
        </div>

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
