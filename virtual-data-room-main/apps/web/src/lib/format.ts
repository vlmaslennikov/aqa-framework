const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : value < 10 ? 1 : 0;

  return `${value.toFixed(decimals)} ${BYTE_UNITS[exponent]}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
