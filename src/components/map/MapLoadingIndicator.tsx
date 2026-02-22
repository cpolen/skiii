'use client';

import { useMapStore } from '@/stores/map';

export function MapLoadingIndicator() {
  const layerLoading = useMapStore((s) => s.layerLoading);
  const isLoading = Object.values(layerLoading).some(Boolean);

  if (!isLoading) return null;

  return (
    <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
        <svg
          className="h-3.5 w-3.5 animate-spin text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-[11px] font-medium text-gray-600">Updating</span>
      </div>
    </div>
  );
}
