'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tour } from '@/lib/types/tour';
import { ElevationProfile } from './ElevationProfile';
import { WeatherSummary } from './WeatherSummary';
import { ConditionsTimeline } from './ConditionsTimeline';
import { GearRecommendation } from './GearRecommendation';
import { AvyDangerBanner } from './AvyDangerBanner';

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-green-100 text-green-800' },
  intermediate: { label: 'Intermediate', color: 'bg-blue-100 text-blue-800' },
  advanced: { label: 'Advanced', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-800' },
};

const ATES_LABELS: Record<string, { label: string; color: string }> = {
  simple: { label: 'Simple', color: 'bg-green-50 text-green-700 ring-green-200' },
  challenging: { label: 'Challenging', color: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  complex: { label: 'Complex', color: 'bg-red-50 text-red-700 ring-red-200' },
};

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function kmToMiles(km: number): number {
  return Math.round(km * 0.621371 * 10) / 10;
}

export function TourDetailView({ tour }: { tour: Tour }) {
  const diff = DIFFICULTY_LABELS[tour.difficulty];
  const ates = ATES_LABELS[tour.ates_rating];
  const aspects = [...new Set(tour.variants.flatMap((v) => v.primary_aspects))];

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{tour.name}</h1>
            <div className="flex items-center gap-2">
              {diff && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${diff.color}`}>
                  {diff.label}
                </span>
              )}
              {ates && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${ates.color}`}
                  title="Avalanche Terrain Exposure Scale — Simple: minimal avy terrain. Challenging: well-defined avy paths. Complex: multiple overlapping avy paths."
                  aria-label={`ATES: ${ates.label} — Avalanche Terrain Exposure Scale`}
                >
                  ATES: {ates.label}
                </span>
              )}
            </div>
          </div>
          <DetailShareButton tourName={tour.name} />
        </div>
      </header>

      {/* Safety disclaimer */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
        <p className="mx-auto max-w-5xl text-xs leading-relaxed text-amber-800">
          This is a planning tool, not a safety assessment. Conditions change rapidly in the
          mountains. Always check the{' '}
          <a
            href="https://www.sierraavalanchecenter.org/advisory"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            full Sierra Avalanche Center forecast
          </a>
          , complete avalanche education, and make your own terrain and snowpack assessment.
        </p>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* At-a-glance stats bar */}
        <section className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Stat icon="📏" label="Distance" value={`${kmToMiles(tour.distance_km)} mi`} />
            <Stat
              icon="⬆️"
              label="Gain"
              value={`${metersToFeet(tour.elevation_gain_m).toLocaleString()}'`}
            />
            <Stat
              icon="🏔️"
              label="Elevation"
              value={`${metersToFeet(tour.min_elevation_m).toLocaleString()}'–${metersToFeet(tour.max_elevation_m).toLocaleString()}'`}
            />
            <Stat
              icon="⏱️"
              label="Time"
              value={`${tour.estimated_hours_range[0]}–${tour.estimated_hours_range[1]} hrs`}
            />
            <Stat icon="🧭" label="Aspects" value={aspects.join(', ')} />
            <Stat
              icon="📐"
              label="Max Slope"
              value={`${Math.max(...tour.variants.map((v) => v.slope_angle_max))}\u00B0`}
            />
            <Stat icon="🔄" label="Transitions" value={String(tour.transition_count)} />
            <Stat icon="📶" label="Cell" value={tour.cell_coverage} />
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Conditions + Weather + Timeline + Gear */}
          <div className="space-y-4">
            {/* Description */}
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm leading-relaxed text-gray-700">{tour.description}</p>
              <p className="mt-2 text-xs italic text-gray-500">{tour.seasonal_notes}</p>
            </section>

            {/* Current weather */}
            <WeatherSummary tour={tour} />

            {/* 72-hour timeline */}
            <ConditionsTimeline tour={tour} />

            {/* Gear recommendations */}
            <GearRecommendation tour={tour} />

            {/* Elevation profile */}
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Elevation Profile
              </h2>
              <ElevationProfile tour={tour} />
            </section>
          </div>

          {/* Right column: Avalanche, Hazards, Route info, Trailhead */}
          <div className="space-y-4">
            {/* Avalanche conditions */}
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Avalanche Conditions
              </h2>
              <AvyDangerBanner />
              <a
                href="https://www.sierraavalanchecenter.org/advisory"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
              >
                View Full SAC Forecast
              </a>
            </section>

            {/* Route variants */}
            {tour.variants.length > 0 && (
              <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Route Variants
                </h2>
                <div className="space-y-2">
                  {tour.variants.map((v) => (
                    <div key={v.name} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{v.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>Aspects: {v.primary_aspects.join(', ')}</span>
                        <span>Max slope: {v.slope_angle_max}&deg;</span>
                        <span>Avg slope: {v.slope_angle_avg}&deg;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Terrain traps — collapsible */}
            {tour.terrain_traps.length > 0 && (
              <details className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <summary className="cursor-pointer p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Terrain Traps
                  </span>
                  <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                    {tour.terrain_traps.length}
                  </span>
                </summary>
                <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                  <ul className="space-y-2">
                    {tour.terrain_traps.map((trap, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-700">
                        <span className="shrink-0 text-orange-500">{'\u26A0'}</span>
                        <span>{trap.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {/* Overhead hazards — collapsible */}
            {tour.overhead_hazards.length > 0 && (
              <details className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <summary className="cursor-pointer p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
                    Overhead Hazards
                  </span>
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                    {tour.overhead_hazards.length}
                  </span>
                </summary>
                <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                  <ul className="space-y-2">
                    {tour.overhead_hazards.map((hazard, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-700">
                        <span className="shrink-0 text-red-500">{'\u26A0'}</span>
                        <span>{hazard.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {/* Escape routes — collapsible */}
            {tour.escape_routes.length > 0 && (
              <details className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <summary className="cursor-pointer p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Escape Routes
                  </span>
                </summary>
                <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                  <ul className="space-y-1">
                    {tour.escape_routes.map((route, i) => (
                      <li key={i} className="text-xs text-gray-700">
                        {'\u2190'} {route}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {/* Trailhead / Parking */}
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trailhead &amp; Parking
              </h2>
              <p className="text-xs text-gray-700">{tour.parking.notes}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                <span>Capacity: {tour.parking.capacity}</span>
                <span>Fills by {tour.parking.fills_by}</span>
              </div>
              {tour.parking.permit && (
                <p className="mt-1 text-xs font-medium text-amber-700">{tour.parking.permit}</p>
              )}
              <p className="mt-2 text-[10px] text-gray-500">
                SAR jurisdiction: {tour.sar_jurisdiction}
              </p>
              <a
                href={`https://maps.google.com/?daddr=${(tour.trailhead.geometry.coordinates as [number, number])[1]},${(tour.trailhead.geometry.coordinates as [number, number])[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Get Directions
              </a>
            </section>

            {/* SNOTEL stations */}
            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nearest SNOTEL Stations
              </h2>
              {tour.nearest_snotel.map((station) => (
                <div key={station.id} className="mb-1 text-xs text-gray-700">
                  <span className="font-medium">{station.name}</span>
                  <span className="ml-1 text-gray-500">
                    ({metersToFeet(station.elevation_m).toLocaleString()}&apos;)
                  </span>
                </div>
              ))}
              <p className="mt-2 text-[10px] italic text-gray-500">
                SNOTEL stations are in sheltered locations and may not represent conditions on
                exposed terrain. Wind-loaded slopes may have significantly more snow.
              </p>
            </section>

            {/* AIARE link */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-800">
                Have you taken an avalanche course?
              </p>
              <a
                href="https://find.avtraining.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Find a Course Near You
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailShareButton({ tourName }: { tourName: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Skiii: ${tourName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User canceled share dialog — not an error
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
      aria-label="Share conditions link"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-sm">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500">{label}</p>
        <p className="truncate text-xs font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
