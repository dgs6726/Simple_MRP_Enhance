"use client";

import type { WeeklyBucket } from "@/lib/types";

interface SparkBarProps {
  weeks: WeeklyBucket[];
  minStock: number;
  maxStock: number;
  leadTimeHorizon: string;
}

export function SparkBar({
  weeks,
  minStock,
  maxStock,
  leadTimeHorizon,
}: SparkBarProps) {
  const ltWeeks = weeks.filter((w) => w.weekStart <= leadTimeHorizon);
  if (ltWeeks.length === 0) return null;

  const vals = ltWeeks.map((w) => w.netPosition);
  const maxAbs = Math.max(...vals.map(Math.abs), 1);
  const hasNeg = vals.some((v) => v < 0);

  // Height of the chart area
  const chartH = 20;
  // If we have negatives, split the space: positive above center, negative below
  const zeroY = hasNeg ? chartH * 0.6 : chartH; // 60% for positive, 40% for negative

  return (
    <div className="flex items-end gap-[2px]" style={{ height: chartH }}>
      {vals.map((v, i) => {
        const isNeg = v < 0;
        const isWarn = !isNeg && minStock > 0 && v < minStock;
        const isOver = !isNeg && maxStock > 0 && v > maxStock;
        const barH = Math.max(1, (Math.abs(v) / maxAbs) * (isNeg ? chartH - zeroY : zeroY));

        const color = isNeg
          ? "#C52026"
          : isWarn
            ? "#F59E0B"
            : isOver
              ? "#3B82F6"
              : "#10B981";

        return (
          <div
            key={i}
            className="relative shrink-0"
            style={{ width: 5, height: chartH }}
          >
            {isNeg ? (
              // Negative bar: below the zero line
              <div
                className="absolute rounded-sm"
                style={{
                  top: zeroY,
                  width: 5,
                  height: barH,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            ) : (
              // Positive bar: above the zero line
              <div
                className="absolute rounded-sm"
                style={{
                  bottom: chartH - zeroY,
                  width: 5,
                  height: barH,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
