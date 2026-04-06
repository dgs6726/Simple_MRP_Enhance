"use client";

import type { MrpItem } from "@/lib/types";
import { fmt, fmtDate } from "@/lib/format";

interface DetailPanelProps {
  item: MrpItem;
}

export function DetailPanel({ item }: DetailPanelProps) {
  const demands = item.detail.filter((d) => d.finalSort === 2);
  const orders = item.detail.filter((d) => d.finalSort === 4);

  const wosColor =
    item.weeksOfSupply < item.leadTimeWeeks
      ? "text-cm-red"
      : item.weeksOfSupply < item.leadTimeWeeks * 2
        ? "text-cm-amber"
        : "text-green-700";

  return (
    <div className="px-4 py-3 bg-[#FAFAFA] border-t border-gray-200">
      {/* Stat Cards */}
      <div className="grid grid-cols-6 gap-2.5 mb-4">
        <StatCard label="On Hand" value={fmt(item.qoh)} />
        <StatCard label="Weekly Req" value={fmt(item.weeklyReq)} />
        <StatCard
          label="Weeks of Supply"
          value={
            item.weeksOfSupply === Infinity
              ? "\u221E"
              : item.weeksOfSupply.toFixed(1)
          }
          valueClass={wosColor}
        />
        <StatCard label="Min / Max" value={`${fmt(item.minStock)} / ${fmt(item.maxStock)}`} />
        <StatCard label="Lead Time" value={`${item.leadTimeWeeks} weeks`} />
        <StatCard
          label="SOQ"
          value={item.stdOrdQty > 0 ? fmt(item.stdOrdQty) : "\u2014"}
        />
      </div>

      {/* Customer + Exception Info */}
      <div className="flex items-center gap-3 mb-4">
        {item.primaryCustomer && (
          <span className="text-[11px] text-cm-gray-med bg-gray-100 px-2 py-0.5 rounded">
            {item.primaryCustomer}
            {item.primaryCustomerPct > 0 && (
              <span className="text-cm-gray-light ml-1">
                ({Math.round(item.primaryCustomerPct * 100)}%)
              </span>
            )}
          </span>
        )}
        {item.exceptions.map((flag) => (
          <span
            key={flag}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              flag === "SHORTAGE"
                ? "bg-cm-red text-white"
                : flag === "PLANNING_SHORTAGE"
                  ? "bg-orange-100 text-orange-800"
                  : flag === "BELOW_MIN"
                    ? "bg-cm-amber-bg text-amber-800"
                    : flag === "ABOVE_MAX"
                      ? "bg-blue-100 text-blue-800"
                      : flag === "NO_COVERAGE"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
            }`}
          >
            {flag.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      {/* Actions */}
      {item.actions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[11px] font-semibold text-cm-charcoal uppercase tracking-wider mb-1.5">
            Recommended Actions
          </h4>
          <div className="space-y-1.5">
            {item.actions.map((action, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs px-3 py-2 rounded-md border ${
                  action.urgency === "critical"
                    ? "bg-red-50 border-red-200"
                    : action.urgency === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    action.urgency === "critical"
                      ? "bg-cm-red text-white"
                      : action.urgency === "warning"
                        ? "bg-cm-amber text-white"
                        : "bg-blue-500 text-white"
                  }`}
                >
                  {action.type.replace(/_/g, " ")}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{action.summary}</div>
                  <div className="text-cm-gray-med mt-0.5">{action.detail}</div>
                  {action.daysUntilImpact > 0 && (
                    <div className="text-cm-gray-light mt-0.5">
                      {action.daysUntilImpact} days until impact
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POs and Demand Sources side by side */}
      <div className="grid grid-cols-2 gap-4">
        {orders.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-cm-green uppercase tracking-wider mb-1.5">
              Open POs ({orders.length})
            </h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-1.5 text-cm-gray-light font-medium">
                    Date
                  </th>
                  <th className="text-left py-1 px-1.5 text-cm-gray-light font-medium">
                    PO / Vendor
                  </th>
                  <th className="text-right py-1 px-1.5 text-cm-gray-light font-medium">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 px-1.5 font-mono text-[11px]">
                      {fmtDate(o.date)}
                    </td>
                    <td className="py-1 px-1.5 text-cm-gray-med">
                      {o.parentPart}
                      {o.vendor && (
                        <span className="text-cm-gray-light ml-1">
                          v:{o.vendor}
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-1.5 text-right font-semibold text-cm-green font-mono text-[11px]">
                      +{fmt(o.openOrders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {demands.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-cm-red uppercase tracking-wider mb-1.5">
              Demand Sources ({demands.length})
            </h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-1.5 text-cm-gray-light font-medium">
                    Date
                  </th>
                  <th className="text-left py-1 px-1.5 text-cm-gray-light font-medium">
                    Parent
                  </th>
                  <th className="text-right py-1 px-1.5 text-cm-gray-light font-medium">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {demands.slice(0, 10).map((d, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 px-1.5 font-mono text-[11px]">
                      {fmtDate(d.date)}
                    </td>
                    <td className="py-1 px-1.5 text-cm-gray-med font-mono text-[11px]">
                      {d.parentPart}
                    </td>
                    <td className="py-1 px-1.5 text-right font-semibold text-cm-red font-mono text-[11px]">
                      {fmt(d.demand)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {demands.length > 10 && (
              <p className="text-[11px] text-cm-gray-light px-1.5 mt-1">
                +{demands.length - 10} more
              </p>
            )}
          </div>
        )}
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
    <div className="bg-white rounded-md border border-gray-200 px-3 py-2">
      <div className="text-[10px] text-cm-gray-light uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
