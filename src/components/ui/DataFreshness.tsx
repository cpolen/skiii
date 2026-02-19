function formatAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

export function DataFreshness({
  label,
  updatedAt,
}: {
  label: string;
  updatedAt: Date | null;
}) {
  if (!updatedAt) {
    return (
      <span className="text-[10px] text-red-500">
        {label}: unavailable
      </span>
    );
  }

  const ageMs = Date.now() - updatedAt.getTime();
  const isStale = ageMs > 12 * 60 * 60 * 1000; // 12 hours

  return (
    <span className={`text-[10px] ${isStale ? 'font-medium text-amber-600' : 'text-gray-400'}`}>
      {label}: {formatAge(updatedAt)}
      {isStale && ' (stale)'}
    </span>
  );
}
