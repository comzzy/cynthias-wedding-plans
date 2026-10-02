export const naira = (n: number) =>
  "₦" + Math.round(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });

/** Short spoken form, e.g. 5000000 -> "5 million naira" */
export const nairaSpoken = (n: number) => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)} million naira`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)} thousand naira`;
  return `${Math.round(n)} naira`;
};

export const prettyDate = (iso: string | null, opts?: Intl.DateTimeFormatOptions) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", opts ?? { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

export const daysUntil = (iso: string | null, from = new Date()) => {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const f = new Date(from.toISOString().slice(0, 10) + "T12:00:00");
  return Math.round((d.getTime() - f.getTime()) / 86_400_000);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
