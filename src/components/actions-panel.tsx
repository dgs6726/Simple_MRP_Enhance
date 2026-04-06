"use client";

import { useState, useMemo } from "react";
import type { MrpItem, ActionType } from "@/lib/types";
import { fmt } from "@/lib/format";

interface ActionsPanelProps {
  items: MrpItem[];
}

const ACTION_LABELS: Record<ActionType, { label: string; color: string }> = {
  PLACE_ORDER: { label: "Place Order", color: "bg-cm-red" },
  PULL_IN_PO: { label: "Pull In", color: "bg-orange-500" },
  PUSH_OUT_PO: { label: "Push Out", color: "bg-blue-500" },
  INCREASE_PO: { label: "Increase", color: "bg-amber-500" },
  REDUCE_PO: { label: "Reduce", color: "bg-indigo-500" },
  CANCEL_PO: { label: "Cancel", color: "bg-gray-500" },
};

const URGENCY_STYLES = {
  critical: {
    row: "bg-red-50 border-red-200",
    badge: "bg-cm-red text-white",
    label: "Critical",
  },
  warning: {
    row: "bg-amber-50 border-amber-200",
    badge: "bg-cm-amber text-white",
    label: "Warning",
  },
  info: {
    row: "bg-blue-50 border-blue-200",
    badge: "bg-blue-500 text-white",
    label: "Plan",
  },
};

export function ActionsPanel({ items }: ActionsPanelProps) {
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ActionType | null>(null);

  // Flatten all actions across items
  const allActions = useMemo(() => {
    const actions: {
      item: MrpItem;
      action: MrpItem["actions"][0];
    }[] = [];
    for (const item of items) {
      for (const action of item.actions) {
        actions.push({ item, action });
      }
    }
    // Sort by urgency then days until impact
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    actions.sort(
      (a, b) =>
        urgencyOrder[a.action.urgency] - urgencyOrder[b.action.urgency] ||
        a.action.daysUntilImpact - b.action.daysUntilImpact
    );
    return actions;
  }, [items]);

  const filtered = useMemo(() => {
    let d = allActions;
    if (urgencyFilter) d = d.filter((a) => a.action.urgency === urgencyFilter);
    if (typeFilter) d = d.filter((a) => a.action.type === typeFilter);
    return d;
  }, [allActions, urgencyFilter, typeFilter]);

  const criticalCount = allActions.filter(
    (a) => a.action.urgency === "critical"
  ).length;
  const warningCount = allActions.filter(
    (a) => a.action.urgency === "warning"
  ).length;
  const infoCount = allActions.filter(
    (a) => a.action.urgency === "info"
  ).length;

  if (allActions.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-cm-gray-light text-sm">
        No recommended actions. All items are within planning parameters.
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="px-6 py-2.5 border-b border-gray-200 flex items-center gap-2 bg-[#FAFAFA]">
        <span className="text-xs font-semibold text-cm-gray-light uppercase tracking-wider mr-2">
          Filter:
        </span>
        <button
          onClick={() =>
            setUrgencyFilter(urgencyFilter === "critical" ? null : "critical")
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            urgencyFilter === "critical"
              ? "bg-cm-red text-white"
              : "border border-gray-300 bg-white text-cm-red hover:bg-gray-50"
          }`}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() =>
            setUrgencyFilter(urgencyFilter === "warning" ? null : "warning")
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            urgencyFilter === "warning"
              ? "bg-cm-amber text-white"
              : "border border-gray-300 bg-white text-amber-600 hover:bg-gray-50"
          }`}
        >
          Warning ({warningCount})
        </button>
        <button
          onClick={() =>
            setUrgencyFilter(urgencyFilter === "info" ? null : "info")
          }
          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
            urgencyFilter === "info"
              ? "bg-blue-500 text-white"
              : "border border-gray-300 bg-white text-blue-500 hover:bg-gray-50"
          }`}
        >
          Plan ({infoCount})
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {(
          [
            "PLACE_ORDER",
            "PULL_IN_PO",
            "PUSH_OUT_PO",
            "REDUCE_PO",
          ] as ActionType[]
        ).map((type) => {
          const count = allActions.filter((a) => a.action.type === type).length;
          if (count === 0) return null;
          const info = ACTION_LABELS[type];
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                typeFilter === type
                  ? `${info.color} text-white`
                  : "border border-gray-300 bg-white text-cm-gray-med hover:bg-gray-50"
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}

        <div className="ml-auto text-xs text-cm-gray-light">
          {filtered.length} actions
        </div>
      </div>

      {/* Actions list */}
      <div className="divide-y divide-gray-100">
        {filtered.map(({ item, action }, i) => {
          const style = URGENCY_STYLES[action.urgency];
          const actionInfo = ACTION_LABELS[action.type];
          return (
            <div
              key={`${item.component}-${i}`}
              className={`flex items-start gap-3 px-6 py-3 ${style.row}`}
            >
              {/* Urgency badge */}
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-1 ${style.badge}`}
              >
                {style.label}
              </span>

              {/* Action type badge */}
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-1 ${actionInfo.color} text-white`}
              >
                {actionInfo.label}
              </span>

              {/* Item info */}
              <div className="min-w-[120px] shrink-0">
                <div className="text-xs font-bold font-mono">
                  {item.component}
                </div>
                <div className="text-[10px] text-cm-gray-light truncate max-w-[140px]">
                  {item.description}
                </div>
              </div>

              {/* Action details */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-cm-charcoal">
                  {action.summary}
                </div>
                <div className="text-[11px] text-cm-gray-med mt-0.5">
                  {action.detail}
                </div>
              </div>

              {/* Days until impact */}
              <div className="text-right shrink-0">
                <div
                  className={`text-sm font-bold font-mono ${
                    action.daysUntilImpact < 14
                      ? "text-cm-red"
                      : action.daysUntilImpact < 30
                        ? "text-cm-amber"
                        : "text-cm-gray-med"
                  }`}
                >
                  {action.daysUntilImpact}d
                </div>
                <div className="text-[9px] text-cm-gray-light uppercase">
                  until impact
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
