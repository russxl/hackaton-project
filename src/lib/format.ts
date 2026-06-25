export function php(n: number): string {
  return "₱" + n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function php0(n: number): string {
  return "₱" + Math.round(n).toLocaleString("en-PH");
}

export function pct(n: number): string {
  return Math.round(n * 100) + "%";
}

export function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
