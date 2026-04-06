"use client";

import { useState } from "react";
import type { MrpItem, MrpDetailRow } from "@/lib/types";
import { fmt, fmtDate } from "@/lib/format";

interface DetailPanelProps {
  item: MrpItem;
}

const ACTION_COLORS: Record<string, string> = {
  ORDER: "bg-cm-red text-white",
  MOVE_IN: "bg-orange-500 text-white",
  MOVE_OUT: "bg-blue-500 text-white",
  REDUCE: "bg-indigo-500 text-white",
};

const ACTION_LABELS: Record<string, string> = {
  ORDER: "Place Orders",
  MOVE_IN: "Move In",
  MOVE_OUT: "Move Out",
  REDUCE: "Reduce",
};

/** Group transactions by ISO week start (Monday) */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

interface WeekGroup {
  weekStart: string;
  rows: MrpDetailRow[];
  weekDemand: number;
  weekSupply: number;
  endingNet: number;
}

function groupByWeek(detail: MrpDetailRow[]): WeekGroup[] {
  const map = new Map<string, MrpDetailRow[]>();
  for (const row of detail) {
    if (!row.date) continue;
    const ws = getWeekStart(row.date);
    const arr = map.get(ws) || [];
    arr.push(row);
    map.set(ws, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, rows]) => {
      const sorted = rows.sort((a, b) => a.index - b.index);
      const weekDemand = sorted.reduce((sum, r) => sum + r.demand, 0);
      const weekSupply = sorted.reduce((sum, r) => sum + r.openOrders, 0);
      // Ending net = last row's net value in the week
      const endingNet = sorted[sorted.length - 1].net;
      return { weekStart, rows: sorted, weekDemand, weekSupply, endingNet };
    });
}

function fmtWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DetailPanel({ item }: DetailPanelProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const weekGroups = groupByWeek(item.detail);

  const toggleWeek = (ws: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(ws)) next.delete(ws);
      else next.add(ws);
      return next;
    });
  };

  const wosColor =
    item.weeksOfSupply < item.leadTimeWeeks
      ? "text-cm-red"
      : item.weeksOfSupply < item.leadTimeWeeks * 2
        ? "text-cm-amber"
        : "text-green-700";

  return (
    <div className="px-6 py-4 bg-[#FAFAFA] border-t border-gray-200 max-w-[1200px]">
      {/* Stat Cards */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        <StatCard label="On Hand" value={fmt(item.qoh)} />
        <StatCard label="Weekly Req" value={fmt(item.weeklyReq)} />
        <StatCard
          label="Weeks of Supply"
          value={item.weeksOfSupply === Infinity ? "\u221E" : item.weeksOfSupply.toFixed(1)}
          valueClass={wosColor}
        />
        <StatCard label="Min / Max" value={`${fmt(item.minStock)} / ${fmt(item.maxStock)}`} />
        <StatCard label="Lead Time" value={`${item.leadTimeWeeks}w`} />
        <StatCard label="SOQ" value={item.stdOrdQty > 0 ? fmt(item.stdOrdQty) : "\u2014"} />
      </div>

      {/* Tags: supplier, customer, exceptions */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {item.lastSupplierName && (
          <span className="text-[11px] text-cm-gray-med bg-green-50 border border-green-200 px-2 py-0.5 rounded">
            Supplier: {item.lastSupplierName}
            {item.lastSupplierNum && <span className="text-cm-gray-light ml-1">({item.lastSupplierNum})</span>}
          </span>
        )}
        {item.primaryCustomer && (
          <span className="text-[11px] text-cm-gray-med bg-gray-100 px-2 py-0.5 rounded">
            Customer: {item.primaryCustomer}
            {item.primaryCustomerPct > 0 && <span className="text-cm-gray-light ml-1">({Math.round(item.primaryCustomerPct * 100)}%)</span>}
          </span>
        )}
        {item.exceptions.map((flag) => (
          <span key={flag} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            flag === "SHORTAGE" ? "bg-cm-red text-white"
            : flag === "PLANNING_SHORTAGE" ? "bg-orange-100 text-orange-800"
            : flag === "BELOW_MIN" ? "bg-cm-amber-bg text-amber-800"
            : flag === "ABOVE_MAX" ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-800"
          }`}>
            {flag.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {item.actions.map((action, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md ${
              action.urgency === "critical" ? "bg-red-50 border border-red-200"
              : action.urgency === "warning" ? "bg-amber-50 border border-amber-200"
              : "bg-blue-50 border border-blue-200"
            }`}>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${ACTION_COLORS[action.type]}`}>
                {ACTION_LABELS[action.type]}
              </span>
              <span className="text-cm-gray-med">{action.summary}</span>
            </div>
          ))}
        </div>
      )}

      {/* Unified Projection Table — weekly summary with expandable detail */}
      <h4 className="text-[11px] font-semibold text-cm-charcoal uppercase tracking-wider mb-1.5">
        Inventory Projection ({weekGroups.length} weeks)
      </h4>
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase w-8"></th>
              <th className="text-left py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Week</th>
              <th className="text-left py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Type</th>
              <th className="text-left py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Source</th>
              <th className="text-right py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Demand</th>
              <th className="text-right py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Supply</th>
              <th className="text-right py-1.5 px-2 text-cm-gray-light font-semibold text-[10px] uppercase">Net Position</th>
            </tr>
          </thead>
          <tbody>
            {weekGroups.map((wg) => {
              const isExpanded = expandedWeeks.has(wg.weekStart);
              const netColor = wg.endingNet < 0 ? "text-cm-red font-bold" : wg.endingNet < item.minStock ? "text-cm-amber font-semibold" : "text-cm-charcoal";

              return (
                <tbody key={wg.weekStart}>
                  {/* Week summary row */}
                  <tr
                    onClick={() => toggleWeek(wg.weekStart)}
                    className="cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                  >
                    <td className="py-1.5 px-2 text-[9px] text-cm-gray-light">
                      {isExpanded ? "\u25BC" : "\u25B6"}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-semibold text-[11px]">
                      {fmtWeekLabel(wg.weekStart)}
                    </td>
                    <td className="py-1.5 px-2 text-cm-gray-light text-[11px]">
                      {wg.rows.length} transaction{wg.rows.length !== 1 ? "s" : ""}
                    </td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 text-right font-mono text-[11px] text-cm-red">
                      {wg.weekDemand !== 0 ? fmt(wg.weekDemand) : ""}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-[11px] text-cm-green">
                      {wg.weekSupply > 0 ? `+${fmt(wg.weekSupply)}` : ""}
                    </td>
                    <td className={`py-1.5 px-2 text-right font-mono text-[11px] ${netColor}`}>
                      {fmt(wg.endingNet)}
                    </td>
                  </tr>
                  {/* Expanded detail rows */}
                  {isExpanded && wg.rows.map((row, ri) => {
                    const typeLabel = row.finalSort === 1 ? "Inventory" : row.finalSort === 4 ? "Open PO" : "Demand";
                    const typeColor = row.finalSort === 1 ? "text-cm-charcoal" : row.finalSort === 4 ? "text-cm-green" : "text-cm-red";
                    return (
                      <tr key={ri} className="bg-gray-50/50 border-b border-gray-50">
                        <td className="py-1 px-2"></td>
                        <td className="py-1 px-2 font-mono text-[10px] text-cm-gray-light pl-6">
                          {fmtDate(row.date)}
                        </td>
                        <td className={`py-1 px-2 text-[10px] font-medium ${typeColor}`}>
                          {typeLabel}
                        </td>
                        <td className="py-1 px-2 text-[10px] text-cm-gray-med font-mono">
                          {row.parentPart !== "_Inventory" ? row.parentPart : ""}
                          {row.vendor && <span className="text-cm-gray-light ml-1">v:{row.vendor}</span>}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-[10px] text-cm-red">
                          {row.demand !== 0 ? fmt(row.demand) : ""}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-[10px] text-cm-green">
                          {row.openOrders > 0 ? `+${fmt(row.openOrders)}` : ""}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-[10px] text-cm-gray-med">
                          {fmt(row.net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = "text-cm-charcoal",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 px-3 py-1.5">
      <div className="text-[9px] text-cm-gray-light uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-base font-bold font-mono ${valueClass}`}>{value}</div>
    </div>
  );
}
