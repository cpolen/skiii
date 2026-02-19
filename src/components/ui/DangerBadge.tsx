import { DANGER_COLORS, DANGER_LABELS, type DangerLevel } from '@/lib/types/avalanche';

export function DangerBadge({ level }: { level: DangerLevel }) {
  const color = DANGER_COLORS[level];
  const label = DANGER_LABELS[level];
  const isExtreme = level === 5;
  const isHighOrExtreme = level >= 4;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
        isExtreme
          ? 'text-white'
          : isHighOrExtreme
            ? 'text-white'
            : level === 2
              ? 'text-gray-900'
              : 'text-white'
      }`}
      style={{ backgroundColor: color }}
    >
      {level} - {label}
    </span>
  );
}
