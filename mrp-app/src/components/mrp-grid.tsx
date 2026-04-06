"use client";

import { useState, useMemo } from "react";
import type { MrpItem, WeeklyBucket, ExceptionFlag } from "@/lib/types";
import { fmt, fmtWeek } from "@/lib/format";
import { SparkBar } from "./spark-bar";
import { DetailPanel } from "./detail-panel";

const ABC_COLORS: Record<string, string> = {
  A: "bg-cm-red",
  B: "bg-amber-500",
  C: "bg-cm-gray-med",
};

function cellColorClass(
  val: number,
  min: number
): { bg: string; text: string } {
  if (val < 0) return { bg: "bg-cm-red", text: "text-white" };
  if (min > 0 && val < min)
    return { bg: "bg-cm-amber-bg", text: "text-amber-800" };
  if (min > 0 && val < min * 2)
    return { bg: "bg-cm-green-bg", text: "text-green-800" };
  return { bg: "", text: "text-cm-charcoal" };
}

interface MrpGridProps {
  items: MrpItem[];
}

export function MrpGrid({ items }: MrpGridProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [abcFilter, setAbcFilter] = useState<string | null>(null);
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFlag | null>(
    null
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let d = items;
    if (abcFilter) d = d.filter((i) => i.abcClass === abcFilter);
    if (exceptionFilter)
      d = d.filter((i) => i.exceptions.includes(exceptionFilter));
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (i) =>
          i.component.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s)
      );
    }
    return d;
  }, [items, abcFilter, exceptionFilter, search]);

  // Get all unique week starts across all items for column headers
  const allWeeks = useMemo(() => {
    const weekSet = new Set<string>();
    items.forEach((item) => item.weeks.forEach((w) => weekSet.add(w.weekStart)));
    return Array.from(weekSet).sort();
  }, [items]);

  // Summary stats
  const shortageCount = items.filter((i) =>
    i.exceptions.includes("SHORTAGE")
  ).length;
  const belowMinCount = items.filter((i) =>
    i.exceptions.includes("BELOW_MIN")
  ).length;
  const noCoverageCount = items.filter((i) =>
    i.exceptions.includes("NO_COVERAGE")
  ).length;
  const totalExposure = items
    .filter((i) => i.exceptions.includes("SHORTAGE"))
    .reduce((sum, i) => {
      const minNet = Math.min(...i.weeks.map((w) => w.netPosition));
      return sum + (minNet < 0 ? Math.abs(minNet) * i.stdCost : 0);
    }, 0);

  return (
    <div>
      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-gray-200 flex items-center gap-3 bg-[#FAFAFA]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item or description..."
          className="px-3 py-1.5 border border-gray-300 rounded text-sm w-56 outline-none focus:border-cm-gray-med"
        />

        {/* ABC filter pills */}
        <div className="flex gap-1">
          {(["A", "B", "C"] as const).map((abc) => (
            <button
              key={abc}
              onClick={() => setAbcFilter(abcFilter === abc ? null : abc)}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                abcFilter === abc
                  ? `${ABC_COLORS[abc]} text-white`
                  : `border border-gray-300 bg-white hover:bg-gray-50`
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

        {/* Exception filter pills */}
        <button
          onClick={() =>
            setExceptionFilter(
              exceptionFilter === "SHORTAGE" ? null : "SHORTAGE"
            )
          }
          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
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
              exceptionFilter === "BELOW_MIN" ? null : "BELOW_MIN"
            )
          }
          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
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
              exceptionFilter === "NO_COVERAGE" ? null : "NO_COVERAGE"
            )
          }
          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
            exceptionFilter === "NO_COVERAGE"
              ? "bg-orange-500 text-white"
              : "border border-gray-300 bg-white text-orange-600 hover:bg-gray-50"
          }`}
        >
          No Coverage ({noCoverageCount})
        </button>

        <div className="ml-auto text-xs text-cm-gray-light">
          {filtered.length} of {items.length} items &middot; Sorted by worst
          net position
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
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
              <th className="py-2 px-2 text-center font-semibold text-cm-gray-light text-[10px] uppercase tracking-wider">
                Trend
              </th>
              {allWeeks.map((w) => (
                <th
                  key={w}
                  className="py-1.5 px-1 text-right font-medium text-cm-gray-med text-[10px] whitespace-nowrap min-w-[62px]"
                >
                  {fmtWeek(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const isExpanded = expanded === item.component;
              const hasShortage = item.exceptions.includes("SHORTAGE");

              // Build a map for quick week lookup
              const weekMap = new Map(
                item.weeks.map((w) => [w.weekStart, w])
              );

              return (
                <tbody key={item.component}>
                  <tr
                    onClick={() =>
                      setExpanded(isExpanded ? null : item.component)
                    }
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
                    <td className="py-2 px-2 text-center">
                      <SparkBar weeks={item.weeks} minStock={item.minStock} />
                    </td>
                    {allWeeks.map((ws) => {
                      const bucket = weekMap.get(ws);
                      if (!bucket) {
                        return (
                          <td
                            key={ws}
                            className="py-1.5 px-1.5 text-right font-mono text-[11px] text-cm-gray-light border-l border-black/[0.04]"
                          >
                            &mdash;
                          </td>
                        );
                      }
                      const c = cellColorClass(
                        bucket.netPosition,
                        item.minStock
                      );
                      return (
                        <td
                          key={ws}
                          className={`py-1.5 px-1.5 text-right font-mono text-[11px] whitespace-nowrap border-l border-black/[0.04] ${c.bg} ${c.text} ${bucket.netPosition < 0 ? "font-bold" : ""}`}
                        >
                          {fmt(bucket.netPosition)}
                        </td>
                      );
                    })}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5 + allWeeks.length} className="p-0">
                        <DetailPanel item={item} />
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-cm-gray-light">
          No items match the current filters.
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-3 border-t border-gray-200 flex gap-5 text-[11px] text-cm-gray-light">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cm-red inline-block" />
          Shortage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cm-amber-bg border border-amber-300 inline-block" />
          Below Min
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cm-green-bg border border-green-300 inline-block" />
          Adequate
        </span>
        <span className="ml-auto">
          Click any row to expand demand sources and open POs
        </span>
      </div>
    </div>
  );
}
