'use client';

import type { Tour } from '@/lib/types/tour';
import { useGearRecommendations } from '@/hooks/useGearRecommendations';
import type { GearItem, GearPosition } from '@/lib/analysis/gear';

const POSITION_LABELS: Record<GearPosition, string> = {
  head: 'Head',
  torso: 'Torso',
  legs: 'Legs',
  feet: 'Feet',
  hands: 'Hands',
  pack: 'Pack',
  ski: 'Ski',
};

const POSITION_ORDER: GearPosition[] = ['head', 'torso', 'legs', 'feet', 'hands', 'ski', 'pack'];

export function GearRecommendation({ tour }: { tour: Tour }) {
  const { items: gearItems, isLoading, error, forecast } = useGearRecommendations(tour);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Gear Recommendations
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="ml-2 text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Gear Recommendations
        </h2>
        <p className="text-xs text-red-500">Unable to load conditions for gear analysis</p>
      </div>
    );
  }

  // Group items by position
  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    label: POSITION_LABELS[pos],
    items: gearItems.filter((g) => g.position === pos),
  })).filter((g) => g.items.length > 0);

  // Count highlighted (condition-driven) items
  const activeItems = gearItems.filter((g) => g.active && g.category !== 'essential');

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Gear Recommendations
      </h2>
      <p className="mb-3 text-[10px] text-gray-500">
        {activeItems.length} condition-specific items highlighted
      </p>

      {/* Silhouette with positioned gear labels */}
      <div className="flex gap-4">
        {/* SVG silhouette */}
        <div className="relative shrink-0" style={{ width: 100, height: 240 }}>
          <svg viewBox="0 0 100 240" className="h-full w-full" fill="none" stroke="currentColor">
            {/* Head */}
            <circle cx="50" cy="24" r="14" strokeWidth="1.5" className="text-gray-300" />
            {/* Neck */}
            <line x1="50" y1="38" x2="50" y2="48" strokeWidth="1.5" className="text-gray-300" />
            {/* Torso */}
            <path d="M30 48 L70 48 L65 120 L35 120 Z" strokeWidth="1.5" className="text-gray-300" />
            {/* Arms */}
            <path d="M30 48 L10 90" strokeWidth="1.5" className="text-gray-300" />
            <path d="M70 48 L90 90" strokeWidth="1.5" className="text-gray-300" />
            {/* Hands */}
            <circle cx="10" cy="92" r="4" strokeWidth="1.5" className="text-gray-300" />
            <circle cx="90" cy="92" r="4" strokeWidth="1.5" className="text-gray-300" />
            {/* Legs */}
            <path d="M40 120 L35 185" strokeWidth="1.5" className="text-gray-300" />
            <path d="M60 120 L65 185" strokeWidth="1.5" className="text-gray-300" />
            {/* Feet/boots */}
            <path d="M25 185 L35 185 L38 195 L22 195 Z" strokeWidth="1.5" className="text-gray-300" />
            <path d="M62 185 L72 195 L58 195 L62 185 Z" strokeWidth="1.5" className="text-gray-300" />
            {/* Skis */}
            <line x1="18" y1="195" x2="18" y2="240" strokeWidth="2" className="text-gray-300" />
            <line x1="78" y1="195" x2="78" y2="240" strokeWidth="2" className="text-gray-300" />
            {/* Pack */}
            <rect x="36" y="52" width="28" height="40" rx="3" strokeWidth="1.5" className="text-gray-200" strokeDasharray="3 2" />

            {/* Highlight dots for active condition-driven gear */}
            {gearItems.filter(g => g.active && g.category !== 'essential').map((g) => {
              const pos = gearDotPosition(g.position);
              return (
                <circle
                  key={g.id}
                  cx={pos.x}
                  cy={pos.y}
                  r="3"
                  fill={categoryColor(g.category)}
                  stroke="white"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>

        {/* Gear list by position */}
        <div className="min-w-0 flex-1 space-y-2">
          {grouped.map((group) => (
            <div key={group.position}>
              <p className="text-[10px] font-semibold uppercase text-gray-500">
                {group.label}
              </p>
              {group.items.map((item) => (
                <GearItemRow key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10px] italic text-gray-500">
        Based on current forecast conditions. Always bring beacon, probe, and shovel in avalanche terrain.
      </p>
    </div>
  );
}

function GearItemRow({ item }: { item: GearItem }) {
  const isHighlighted = item.active && item.category !== 'essential';
  const isEssential = item.category === 'essential';

  return (
    <div
      className={`flex items-start gap-1.5 py-0.5 ${
        isHighlighted ? 'rounded bg-blue-50 px-1.5' : ''
      }`}
    >
      <span
        className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
          isEssential
            ? 'bg-gray-400'
            : item.active
              ? categoryBgClass(item.category)
              : 'bg-gray-200'
        }`}
      />
      <div className="min-w-0">
        <span className={`text-xs ${isHighlighted ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
          {item.name}
        </span>
        {item.active && item.category !== 'essential' && (
          <p className="text-[10px] text-gray-500">{item.reason}</p>
        )}
      </div>
    </div>
  );
}

/** Map position to an (x,y) coordinate on the SVG silhouette for highlight dots */
function gearDotPosition(pos: GearPosition): { x: number; y: number } {
  switch (pos) {
    case 'head': return { x: 50, y: 10 };
    case 'torso': return { x: 50, y: 70 };
    case 'legs': return { x: 50, y: 150 };
    case 'feet': return { x: 50, y: 190 };
    case 'hands': return { x: 10, y: 85 };
    case 'pack': return { x: 50, y: 90 };
    case 'ski': return { x: 78, y: 220 };
  }
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'weather': return '#3B82F6';
    case 'safety': return '#EF4444';
    default: return '#9CA3AF';
  }
}

function categoryBgClass(cat: string): string {
  switch (cat) {
    case 'weather': return 'bg-blue-500';
    case 'safety': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}
