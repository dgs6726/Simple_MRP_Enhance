/** Format a number with commas, rounding to integer */
export function fmt(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return Math.round(n).toLocaleString("en-US");
}

/** Format a number as currency (no decimals) */
export function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return "$" + (n / 1_000_000).toFixed(1) + "M";
  }
  if (Math.abs(n) >= 1_000) {
    return "$" + Math.round(n / 1_000).toLocaleString("en-US") + "K";
  }
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Format ISO date string as "Mon DD" */
export function fmtWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format week header with week number relative to a start date: "Feb 9 (W1)" */
export function fmtWeekWithNum(dateStr: string, startDate: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const s = new Date(startDate + "T00:00:00");
  const weekNum = Math.floor((d.getTime() - s.getTime()) / (7 * 86400000)) + 1;
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return weekNum > 0 ? `${label} W${weekNum}` : label;
}

/** Format ISO date string as "MM/DD" */
export function fmtDate(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const parts = dateStr.split("-");
  return `${parts[1]}/${parts[2]}`;
}

/** Format ISO date string as "MMM DD, YYYY" */
export function fmtDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
