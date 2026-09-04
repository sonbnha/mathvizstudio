export const APP_VERSION = {
  version: "1.2.0",
  stage: "stable", // "alpha" | "beta" | "rc" | "stable"
  fullString: "v1.2.0",
  buildDate: "05/09/2026",
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
