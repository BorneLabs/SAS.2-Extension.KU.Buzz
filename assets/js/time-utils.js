
export function parseTimestamp(dateStr) {
  return new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
}

export function formatLiveTime(dateStr) {
  const date = parseTimestamp(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.max(1, Math.floor(diffMs / 60000)); 
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 28) return `${Math.floor(diffDays / 7)}w`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
}
