'use client';

import { useMemo } from 'react';
import type { Tour } from '@/lib/types/tour';
import { useGearRecommendations } from '@/hooks/useGearRecommendations';

/**
 * Compact gear list for the sidebar — shows only condition-specific items.
 * No SVG silhouette; just a grouped text list with reasons.
 */
export function GearListCompact({ tour }: { tour: Tour }) {
  const { items, isLoading, error, forecast } = useGearRecommendations(tour);

  const activeItems = useMemo(() => {
    // Only show active non-essential items — the interesting ones
    return items.filter((g) => g.active && g.category !== 'essential');
  }, [items]);

  if (isLoading) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Gear
        </h2>
        <div className="flex items-center py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="ml-2 text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Gear
        </h2>
        <p className="text-xs text-red-500">Unable to load conditions</p>
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Gear
        </h2>
        <p className="text-xs text-gray-500">No condition-specific gear alerts</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Condition-Specific Gear
      </h2>
      <div className="space-y-1">
        {activeItems.map((item) => (
          <div key={item.id} className="flex items-start gap-1.5">
            <span
              className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                item.category === 'weather' ? 'bg-blue-500' : 'bg-red-500'
              }`}
            />
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-900">{item.name}</span>
              <span className="ml-1 text-[10px] text-gray-500">{item.reason}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-gray-500">
        Always bring beacon, probe, shovel in avalanche terrain.
      </p>
    </div>
  );
}
