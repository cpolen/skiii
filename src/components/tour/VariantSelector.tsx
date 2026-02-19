'use client';

import type { Tour } from '@/lib/types/tour';
import { useMapStore } from '@/stores/map';

/**
 * Compact route variant picker for the sidebar.
 * Only renders when a tour has more than one variant.
 */
export function VariantSelector({ tour }: { tour: Tour }) {
  const selectedIndex = useMapStore((s) => s.selectedVariantIndex);
  const setSelectedIndex = useMapStore((s) => s.setSelectedVariantIndex);

  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        Route Variant
      </p>
      <div className="mt-1.5 flex flex-col gap-1">
        {tour.variants.map((v, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={v.name}
              onClick={() => setSelectedIndex(i)}
              className={`rounded-md px-2.5 py-2.5 text-left text-[11px] transition-colors min-h-[44px] ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">{v.name}</span>
              <span className={`ml-2 ${active ? 'text-blue-200' : 'text-gray-500'}`}>
                {v.primary_aspects.join('/')} &middot; max {v.slope_angle_max}&deg;
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
