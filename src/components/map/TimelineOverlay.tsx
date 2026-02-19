'use client';

import { useState } from 'react';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import { ConditionsTimeline } from '@/components/tour/ConditionsTimeline';

/**
 * Floating forecast timeline overlay on the map.
 * Shows when a tour is selected (desktop only).
 * Renders ConditionsTimeline in overlay mode — a single merged chart.
 */
export function TimelineOverlay() {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const [collapsed, setCollapsed] = useState(false);

  const tour = selectedTourSlug
    ? tours.find((t) => t.slug === selectedTourSlug)
    : null;

  if (!tour) return null;

  if (collapsed) {
    return (
      <div className="absolute bottom-2 left-2 z-10 hidden md:block">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-lg ring-1 ring-gray-200 backdrop-blur-sm hover:bg-white"
        >
          Show forecast
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 z-10 hidden w-[54%] min-w-[420px] -translate-x-1/2 md:block">
      <div className="rounded-lg bg-white/90 shadow-lg ring-1 ring-gray-200 backdrop-blur-sm">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 pt-2 pb-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              72h Forecast
            </span>
            {/* Compact legend */}
            <span className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="inline-block h-0.5 w-3.5 rounded bg-blue-500" /> Wind
              <span className="inline-block h-0.5 w-3.5 rounded bg-red-500 opacity-60" style={{ borderTop: '1px dashed' }} /> Ridge
              <span className="inline-block h-0.5 w-3.5 rounded bg-amber-500" /> Temp
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-300 opacity-50" /> Precip
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
          >
            Hide
          </button>
        </div>
        <ConditionsTimeline tour={tour} overlay />
      </div>
    </div>
  );
}
