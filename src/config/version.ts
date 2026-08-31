export const APP_VERSION = {
  version: "0.1.5",
  stage: "alpha", // "alpha" | "beta" | "rc" | "stable"
  fullString: "v0.1.5-alpha",
  buildDate: "31/08/2026",
};

/**
 * Format date string or Date object into standard Vietnamese date format DD/MM/YYYY
 */
export function formatDateVN(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
