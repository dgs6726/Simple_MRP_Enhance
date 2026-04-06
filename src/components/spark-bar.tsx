"use client";

import type { WeeklyBucket } from "@/lib/types";

interface SparkBarProps {
  weeks: WeeklyBucket[];
  minStock: number;
  leadTimeHorizon: string;
}

export function SparkBar({ weeks, minStock, leadTimeHorizon }: SparkBarProps) {
  const ltWeeks = weeks.filter((w) => w.weekStart <= leadTimeHorizon);
  if (ltWeeks.length === 0) return null;

  const vals = ltWeeks.map((w) => w.netPosition);
  const maxV = Math.max(...vals.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-[2px] h-5">
      {vals.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / maxV) * 18);
        const isNeg = v < 0;
        const isWarn = !isNeg && minStock > 0 && v < minStock;

        return (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 5,
              height: h,
              backgroundColor: isNeg
                ? "#C52026"
                : isWarn
                  ? "#F59E0B"
                  : "#10B981",
              opacity: 0.8,
            }}
          />
        );
      })}
    </div>
  );
}
