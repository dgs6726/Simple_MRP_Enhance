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

  return (
    <div className="flex items-end gap-[2px] h-5">
      {ltWeeks.map((w, i) => {
        const isNeg = w.netPosition < 0;
        const isWarn = !isNeg && minStock > 0 && w.netPosition < minStock;

        return (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 5,
              height: 14,
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
