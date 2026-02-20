'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import type { Tour } from '@/lib/types/tour';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-100 text-blue-800' },
  advanced: { label: 'Advanced', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-800' },
};

const ATES_LABELS: Record<string, { label: string; color: string }> = {
  simple: { label: 'ATES: Simple', color: 'bg-green-50 text-green-700' },
  challenging: { label: 'ATES: Challenging', color: 'bg-yellow-50 text-yellow-700' },
  complex: { label: 'ATES: Complex', color: 'bg-red-50 text-red-700' },
};

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function kmToMiles(km: number): number {
  return Math.round(km * 0.621371 * 10) / 10;
}

export const TourCard = memo(function TourCard({
  tour,
  expanded,
  conditions,
  snowType,
  isLoading,
  rank,
}: {
  tour: Tour;
  expanded?: boolean;
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading?: boolean;
  rank?: number;
}) {
  const router = useRouter();
  const diff = DIFFICULTY_LABELS[tour.difficulty];
  const ates = ATES_LABELS[tour.ates_rating];
  const aspects = tour.variants.flatMap((v) => v.primary_aspects);
  const uniqueAspects = [...new Set(aspects)];

  return (
    <div
      className={`rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md ${
        expanded ? 'shadow-none ring-0' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {rank != null && rank <= 3 && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              rank === 1 ? 'bg-amber-100 text-amber-800' :
              rank === 2 ? 'bg-gray-100 text-gray-600' :
              'bg-orange-50 text-orange-700'
            }`}>
              #{rank}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-900">{tour.name}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          {diff && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.color}`}>
              {diff.label}
            </span>
          )}
          {ates && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ates.color}`}
              title="Avalanche Terrain Exposure Scale — Simple: minimal avy terrain. Challenging: well-defined avy paths. Complex: multiple overlapping avy paths."
              aria-label={`${ates.label} — Avalanche Terrain Exposure Scale`}
            >
              {ates.label}
            </span>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span>{kmToMiles(tour.distance_km)} mi</span>
        <span>{metersToFeet(tour.elevation_gain_m).toLocaleString()}&apos; gain</span>
        <span>
          {tour.estimated_hours_range[0]}-{tour.estimated_hours_range[1]} hrs
        </span>
        <span>{uniqueAspects.join(', ')}</span>
      </div>

      {/* Conditions score bar */}
      {isLoading && (
        <div className="mt-2 space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        </div>
      )}
      {!isLoading && conditions && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${conditions.composite}%`,
                  backgroundColor: conditions.bandColor,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-gray-700">
              {conditions.composite}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: conditions.bandColor }}>
            {conditions.bandLabel}
          </p>
        </div>
      )}

      {/* Snow type */}
      {!isLoading && snowType && (
        <p className="mt-1 text-[11px] text-gray-600">
          <span className="mr-1">{snowType.emoji}</span>
          <span className="font-medium">{snowType.label}</span>
          <span className="ml-1 text-gray-500">&middot; {snowType.detail}</span>
        </p>
      )}

      {/* Critical conditions alert */}
      {!isLoading && conditions && conditions.composite < 20 && (
        <div className="mt-1.5 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
          {conditions.reasons[0]}
        </div>
      )}

      {/* Expanded view shows more detail */}
      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-gray-600">{tour.description}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Stat
              label="Elevation Range"
              value={`${metersToFeet(tour.min_elevation_m).toLocaleString()}'–${metersToFeet(tour.max_elevation_m).toLocaleString()}'`}
            />
            <Stat label="Transitions" value={String(tour.transition_count)} />
            <Stat
              label="Max Slope"
              value={`${Math.max(...tour.variants.map((v) => v.slope_angle_max))}\u00B0`}
            />
            <Stat label="Cell Coverage" value={tour.cell_coverage} />
          </div>

          {/* Variants */}
          {tour.variants.length > 1 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Route Variants
              </p>
              <div className="mt-1 space-y-1">
                {tour.variants.map((v) => (
                  <div
                    key={v.name}
                    className="rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-600"
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="ml-2 text-gray-500">
                      {v.primary_aspects.join('/')} &middot; max {v.slope_angle_max}&deg;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terrain traps */}
          {tour.terrain_traps.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Terrain Traps
              </p>
              <ul className="mt-1 space-y-0.5">
                {tour.terrain_traps.map((trap, i) => (
                  <li key={i} className="text-[11px] text-gray-600">
                    <span className="text-orange-500">\u26A0</span> {trap.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parking */}
          <div className="rounded bg-gray-50 p-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Trailhead
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600">{tour.parking.notes}</p>
            <p className="text-[11px] text-gray-500">
              {tour.parking.capacity} &middot; Fills by {tour.parking.fills_by}
            </p>
            {tour.parking.permit && (
              <p className="text-[11px] font-medium text-amber-700">{tour.parking.permit}</p>
            )}
          </div>

          {/* Seasonal notes */}
          <p className="text-[11px] italic text-gray-500">{tour.seasonal_notes}</p>

          {/* Link to detail page */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              router.push(`/tour/${tour.slug}`);
            }}
            className="mt-2 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
          >
            View Full Conditions Dashboard
          </button>
        </div>
      )}
    </div>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  );
}
