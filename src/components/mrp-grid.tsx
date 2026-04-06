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

// Fixed column widths (px) — shared between header and rows for perfect alignment
const C = {
  item: 100,
  desc: 180,
  abc: 42,
  qoh: 72,
  lt: 40,
  min: 62,
  max: 62,
  curExcess: 78,
  maxExcess: 78,
  trend: 140,
  week: 72,
} as const;

const FIXED_WIDTH = C.item + C.desc + C.abc + C.qoh + C.lt + C.min + C.max + C.curExcess + C.maxExcess + C.trend;
const COL_COUNT = 10; // number of fixed columns (for colSpan)

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

function computeMaxFutureExcess(item: MrpItem): number {
  if (item.maxStock <= 0 || item.weeks.length === 0) return 0;
  let maxExcess = 0;
  for (const w of item.weeks) {
    const excess = w.netPosition - item.maxStock;
    if (excess > maxExcess) maxExcess = excess;
  }
  return maxExcess * item.stdCost;
}

const ROW_HEIGHT = 33;
const EXPANDED_HEIGHT = 400;

function renderRow(
  item: MrpItem,
  allWeeks: string[],
  ltBoundaryIndex: number,
  isExpanded: boolean,
  onToggle: () => void
) {
  const hasShortage = item.exceptions.includes("SHORTAGE");
  const excessDollars = computeExcessDollars(item);
  const maxExcess = computeMaxFutureExcess(item);
  const stickyBg = isExpanded
    ? "bg-gray-100"
    : hasShortage
      ? "bg-[#fef8f8]"
      : "bg-white";

  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex items-center cursor-pointer border-b hover:bg-gray-50 ${
          isExpanded
            ? "bg-gray-100 border-gray-200"
            : hasShortage
              ? "bg-[#fef8f8] border-gray-100"
              : "bg-white border-gray-100"
        }`}
        style={{ minWidth: `${FIXED_WIDTH + allWeeks.length * C.week}px` }}
      >
        <div className={`py-2 px-2 pl-5 font-semibold font-mono text-[11px] whitespace-nowrap sticky left-0 z-[5] shrink-0 ${stickyBg} border-r border-gray-100`} style={{ width: C.item }}>
          <span className="mr-1 text-[8px] text-cm-gray-light">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
          {item.component}
        </div>
        <div className={`py-2 px-2 text-cm-gray-med whitespace-nowrap overflow-hidden text-ellipsis shrink-0 sticky left-[${C.item}px] z-[5] text-xs ${stickyBg} border-r border-gray-200`} style={{ width: C.desc }}>
          {item.description}
        </div>
        <div className="py-2 px-1 text-center shrink-0" style={{ width: C.abc }}>
          <span className={`inline-block w-5 h-[18px] leading-[18px] rounded text-[10px] font-bold text-white text-center ${ABC_COLORS[item.abcClass] || "bg-gray-400"}`}>
            {item.abcClass}
          </span>
        </div>
        <div className="py-2 px-2 text-right font-mono font-medium text-[11px] shrink-0" style={{ width: C.qoh }}>
          {fmt(item.qoh)}
        </div>
        <div className="py-2 px-1 text-right font-mono text-[11px] text-cm-gray-med shrink-0" style={{ width: C.lt }}>
          {item.leadTimeWeeks}w
        </div>
        <div className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med shrink-0" style={{ width: C.min }}>
          {fmt(item.minStock)}
        </div>
        <div className="py-2 px-2 text-right font-mono text-[11px] text-cm-gray-med shrink-0" style={{ width: C.max }}>
          {fmt(item.maxStock)}
        </div>
        <div className={`py-2 px-2 text-right font-mono text-[11px] shrink-0 ${excessDollars > 0 ? "text-blue-700 font-semibold" : "text-gray-200"}`} style={{ width: C.curExcess }}>
          {excessDollars > 0 ? fmtCurrency(excessDollars) : "\u2014"}
        </div>
        <div className={`py-2 px-2 text-right font-mono text-[11px] shrink-0 ${maxExcess > 0 ? "text-blue-500" : "text-gray-200"}`} style={{ width: C.maxExcess }}>
          {maxExcess > 0 ? fmtCurrency(maxExcess) : "\u2014"}
        </div>
        <div className="py-2 px-1 text-center shrink-0 overflow-hidden" style={{ width: C.trend }}>
          <SparkBar weeks={item.weeks} minStock={item.minStock} maxStock={item.maxStock} leadTimeHorizon={item.leadTimeHorizon} />
        </div>
        {allWeeks.map((ws, idx) => {
          const isWithinLT = idx <= ltBoundaryIndex;
          const isLtBoundary = idx === ltBoundaryIndex;

          let netPosition: number | null = null;
          for (const w of item.weeks) {
            if (w.weekStart === ws) { netPosition = w.netPosition; break; }
          }

          if (netPosition === null) {
            return (
              <div key={ws} className={`py-1.5 px-1 text-right font-mono text-[11px] border-l border-black/[0.04] shrink-0 ${isWithinLT ? "text-cm-gray-light" : "text-gray-200"} ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`} style={{ width: C.week }}>
                &mdash;
              </div>
            );
          }
          const c = cellColorClass(netPosition, item.minStock, item.maxStock, isWithinLT);
          return (
            <div key={ws} className={`py-1.5 px-1 text-right font-mono text-[11px] whitespace-nowrap border-l border-black/[0.04] shrink-0 ${c.bg} ${c.text} ${netPosition < 0 && isWithinLT ? "font-bold" : ""} ${isLtBoundary ? "border-r-2 border-r-cm-charcoal/20" : ""}`} style={{ width: C.week }}>
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

type SortKey = "component" | "description" | "abcClass" | "qoh" | "leadTimeWeeks" | "minStock" | "maxStock" | "curExcess" | "maxExcess" | null;
type SortDir = "asc" | "desc";

export function MrpGrid({ items, snapshotDate }: MrpGridProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [abcFilter, setAbcFilter] = useState<string | null>(null);
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFlag | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSort = useCallback((key: SortKey) => {
    startTransition(() => {
      setSortKey((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return key;
        }
        setSortDir(key === "component" || key === "description" ? "asc" : "desc");
        return key;
      });
    });
  }, []);

  const search = useDebouncedValue(searchInput, 200);
  const supplierFilter = useDebouncedValue(supplierInput, 200);

  const setAbcFilterT = useCallback((val: string | null) => {
    startTransition(() => setAbcFilter(val));
  }, []);
  const setExceptionFilterT = useCallback((val: ExceptionFlag | null) => {
    startTransition(() => setExceptionFilter(val));
  }, []);

  const baseFiltered = useMemo(() => {
    let d = items;
    if (abcFilter) d = d.filter((i) => i.abcClass === abcFilter);
    if (search) {
      const s = search.toLowerCase();
      d = d.filter((i) => i.component.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
    }
    if (supplierFilter) {
      const s = supplierFilter.toLowerCase();
      d = d.filter((i) => i.lastSupplierName.toLowerCase().includes(s) || i.lastSupplierNum.toLowerCase().includes(s));
    }
    return d;
  }, [items, abcFilter, search, supplierFilter]);

  const shortageCount = baseFiltered.filter((i) => i.exceptions.includes("SHORTAGE")).length;
  const planningShortageCount = baseFiltered.filter((i) => i.exceptions.includes("PLANNING_SHORTAGE") && !i.exceptions.includes("SHORTAGE")).length;
  const belowMinCount = baseFiltered.filter((i) => i.exceptions.includes("BELOW_MIN")).length;
  const aboveMaxCount = baseFiltered.filter((i) => i.exceptions.includes("ABOVE_MAX")).length;

  const exceptionFiltered = useMemo(() => {
    if (!exceptionFilter) return baseFiltered;
    return baseFiltered.filter((i) => i.exceptions.includes(exceptionFilter));
  }, [baseFiltered, exceptionFilter]);

  const filtered = useMemo(() => {
    if (!sortKey) return exceptionFiltered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...exceptionFiltered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "curExcess") {
        av = computeExcessDollars(a);
        bv = computeExcessDollars(b);
      } else if (sortKey === "maxExcess") {
        av = computeMaxFutureExcess(a);
        bv = computeMaxFutureExcess(b);
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [exceptionFiltered, sortKey, sortDir]);

  const allWeeks = useMemo(() => {
    const weekSet = new Set<string>();
    items.forEach((item) => item.weeks.forEach((w) => weekSet.add(w.weekStart)));
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
    estimateSize: (index) => expanded === filtered[index]?.component ? EXPANDED_HEIGHT : ROW_HEIGHT,
    overscan: 10,
  });

  const handleToggle = useCallback((component: string) => {
    setExpanded((prev) => (prev === component ? null : component));
  }, []);

  const totalWidth = `${FIXED_WIDTH + allWeeks.length * C.week}px`;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-gray-200 flex items-center gap-2 bg-[#FAFAFA] flex-wrap shrink-0">
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search item..." className="px-3 py-1.5 border border-gray-300 rounded text-sm w-40 outline-none focus:border-cm-gray-med" />
        <input value={supplierInput} onChange={(e) => setSupplierInput(e.target.value)} placeholder="Filter by supplier..." className="px-3 py-1.5 border border-gray-300 rounded text-sm w-44 outline-none focus:border-cm-gray-med" />

        <div className="flex gap-1">
          {(["A", "B", "C"] as const).map((abc) => (
            <button key={abc} onClick={() => setAbcFilterT(abcFilter === abc ? null : abc)}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${abcFilter === abc ? `${ABC_COLORS[abc]} text-white` : "border border-gray-300 bg-white hover:bg-gray-50"}`}
              style={abcFilter !== abc ? { color: abc === "A" ? "#C52026" : abc === "B" ? "#D4812A" : "#4D4D4D" } : undefined}
            >{abc}</button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-300" />

        <button onClick={() => setExceptionFilterT(exceptionFilter === "SHORTAGE" ? null : "SHORTAGE")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${exceptionFilter === "SHORTAGE" ? "bg-cm-red text-white" : "border border-gray-300 bg-white text-cm-red hover:bg-gray-50"}`}>
          Shortages ({shortageCount})
        </button>
        <button onClick={() => setExceptionFilterT(exceptionFilter === "PLANNING_SHORTAGE" ? null : "PLANNING_SHORTAGE")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${exceptionFilter === "PLANNING_SHORTAGE" ? "bg-orange-500 text-white" : "border border-gray-300 bg-white text-orange-500 hover:bg-gray-50"}`}>
          Future ({planningShortageCount})
        </button>
        <button onClick={() => setExceptionFilterT(exceptionFilter === "BELOW_MIN" ? null : "BELOW_MIN")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${exceptionFilter === "BELOW_MIN" ? "bg-cm-amber text-white" : "border border-gray-300 bg-white text-amber-600 hover:bg-gray-50"}`}>
          Below Min ({belowMinCount})
        </button>
        <button onClick={() => setExceptionFilterT(exceptionFilter === "ABOVE_MAX" ? null : "ABOVE_MAX")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${exceptionFilter === "ABOVE_MAX" ? "bg-blue-600 text-white" : "border border-gray-300 bg-white text-blue-600 hover:bg-gray-50"}`}>
          Over Max ({aboveMaxCount})
        </button>

        <div className="ml-auto text-xs text-cm-gray-light">
          {filtered.length} of {items.length} items
        </div>
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Header */}
        <div className="flex items-center bg-[#F9FAFB] sticky top-0 z-10 border-b border-gray-200" style={{ minWidth: totalWidth }}>
          {[
            { key: "component" as SortKey, label: "Item", w: C.item, align: "text-left pl-5", sticky: "sticky left-0 bg-[#F9FAFB] z-20 border-r border-gray-100" },
            { key: "description" as SortKey, label: "Desc", w: C.desc, align: "text-left", sticky: `sticky bg-[#F9FAFB] z-20 border-r border-gray-200`, stickyLeft: C.item },
            { key: "abcClass" as SortKey, label: "ABC", w: C.abc, align: "text-center" },
            { key: "qoh" as SortKey, label: "QOH", w: C.qoh, align: "text-right" },
            { key: "leadTimeWeeks" as SortKey, label: "LT", w: C.lt, align: "text-right" },
            { key: "minStock" as SortKey, label: "Min", w: C.min, align: "text-right" },
            { key: "maxStock" as SortKey, label: "Max", w: C.max, align: "text-right" },
            { key: "curExcess" as SortKey, label: "Cur. Excess", w: C.curExcess, align: "text-right" },
            { key: "maxExcess" as SortKey, label: "Max Excess", w: C.maxExcess, align: "text-right" },
            { key: null as SortKey, label: "Trend", w: C.trend, align: "text-center" },
          ].map((col, i) => {
            const isSorted = sortKey === col.key && col.key !== null;
            const arrow = isSorted ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";
            return (
              <div
                key={i}
                onClick={col.key ? () => handleSort(col.key) : undefined}
                className={`py-2 px-2 font-semibold text-[10px] uppercase tracking-wider shrink-0 whitespace-nowrap ${col.align} ${col.sticky || ""} ${col.key ? "cursor-pointer hover:text-cm-charcoal select-none" : ""} ${isSorted ? "text-cm-charcoal" : "text-cm-gray-light"}`}
                style={{ width: col.w, ...(col.stickyLeft != null ? { left: col.stickyLeft } : {}) }}
              >
                {col.label}{arrow}
              </div>
            );
          })}
          {allWeeks.map((w) => (
            <div key={w} className="py-1.5 px-1 text-right font-medium text-cm-gray-med text-[10px] whitespace-nowrap shrink-0" style={{ width: C.week }}>
              {fmtWeekWithNum(w, snapshotDate)}
            </div>
          ))}
        </div>

        {/* Virtual rows */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filtered[virtualRow.index];
            if (!item) return null;
            return (
              <div key={item.component} ref={rowVirtualizer.measureElement} data-index={virtualRow.index}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}>
                {renderRow(item, allWeeks, ltBoundaryMap.get(item.component) ?? -1, expanded === item.component, () => handleToggle(item.component))}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-cm-gray-light">No items match the current filters.</div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-2 border-t border-gray-200 flex gap-4 text-[11px] text-cm-gray-light flex-wrap shrink-0">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cm-red inline-block" />Shortage (in LT)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" />Shortage (future)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cm-amber-bg border border-amber-300 inline-block" />Below Min</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-300 inline-block" />Above Max</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 border-r-2 border-r-cm-charcoal/30 inline-block" />LT boundary</span>
        <span className="ml-auto">Click row to expand &middot; Dimmed = beyond lead time</span>
      </div>
    </div>
  );
}
