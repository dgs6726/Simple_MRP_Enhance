"use client";

import type { WeeklyBucket } from "@/lib/types";

interface SparkBarProps {
  weeks: WeeklyBucket[];
  minStock: number;
}

export function SparkBar({ weeks, minStock }: SparkBarProps) {
  const vals = weeks.map((w) => w.netPosition);
  const maxV = Math.max(...vals.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-px h-6">
      {vals.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / maxV) * 22);
        const isNeg = v < 0;
        const isWarn = !isNeg && minStock > 0 && v < minStock;

        return (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 6,
              height: h,
              backgroundColor: isNeg
                ? "#C52026"
                : isWarn
                  ? "#F59E0B"
                  : "#10B981",
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}
