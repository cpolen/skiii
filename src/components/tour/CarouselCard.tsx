'use client';

import { memo } from 'react';
import type { Tour } from '@/lib/types/tour';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function kmToMiles(km: number): number {
  return Math.round(km * 0.621371 * 10) / 10;
}

/**
 * Compact tour card for the Surfline-style carousel.
 * Shows conditions dot, score, tour name, snow type, and a key stat.
 */
export const CarouselCard = memo(function CarouselCard({
  tour,
  conditions,
  snowType,
  isLoading,
  isActive,
}: {
  tour: Tour;
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 flex-col justify-between rounded-xl bg-white p-3 shadow-md ring-1 transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-blue-400 shadow-lg scale-[1.02]'
          : 'ring-gray-200/60 hover:shadow-lg'
      }`}
      style={{ width: 200, minHeight: 88 }}
    >
      {/* Top row: conditions dot + score + name */}
      <div className="flex items-start gap-2">
        {isLoading ? (
          <div className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded-full bg-gray-200" />
        ) : conditions ? (
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: conditions.bandColor }}
          >
            {conditions.composite}
          </div>
        ) : (
          <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-200" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-gray-900">{tour.name}</p>
          {!isLoading && conditions && (
            <p className="text-[10px] font-medium" style={{ color: conditions.bandColor }}>
              {conditions.bandLabel}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: snow type + stats */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500">
        {!isLoading && snowType ? (
          <span className="truncate">
            <span className="mr-0.5">{snowType.emoji}</span>
            <span className="font-medium text-gray-600">{snowType.label}</span>
          </span>
        ) : isLoading ? (
          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
        ) : (
          <span />
        )}
        <span className="shrink-0 text-gray-400">
          {metersToFeet(tour.elevation_gain_m).toLocaleString()}&apos; · {kmToMiles(tour.distance_km)}mi
        </span>
      </div>
    </div>
  );
});
