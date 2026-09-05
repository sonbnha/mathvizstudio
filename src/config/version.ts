export const APP_VERSION = {
  version: "1.2.1",
  stage: "stable", // "alpha" | "beta" | "rc" | "stable"
  fullString: "v1.2.1",
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

/**
 * Format date string or Date object into standard Vietnamese date-time format HH:mm DD/MM/YYYY
 */
export function formatDateTimeVN(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Format date string or Date object into Vietnamese full date-time format DD/MM/YYYY HH:mm:ss
 */
export function formatFullDateTimeVN(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
