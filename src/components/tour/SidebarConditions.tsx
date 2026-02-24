'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tour } from '@/lib/types/tour';
import { useWeather } from '@/hooks/useWeather';
import type { WeatherForecast } from '@/lib/types/conditions';
import { analyzeTiming, assessHour } from '@/lib/analysis/timing';
import { useMapStore } from '@/stores/map';
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { assessConditions } from '@/lib/analysis/scoring';
import { WeatherSummary } from './WeatherSummary';
import { AvyDangerBanner } from './AvyDangerBanner';
import { OverviewTimeline } from './OverviewTimeline';
import { VariantSelector } from './VariantSelector';


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

/**
 * Sidebar view for a selected tour: header + collapsed static info accordion +
 * dynamic weather/timeline/gear conditions below.
 */
export function SidebarConditions({ tour, hideTimeline }: { tour: Tour; hideTimeline?: boolean }) {
  const router = useRouter();
  const { data: forecast, isLoading: weatherLoading } = useWeather(tour);
  const { data: avyData } = useAvyForecast();
  const selectedHour = useMapStore((s) => s.selectedForecastHour);
  const setSelectedHour = useMapStore((s) => s.setSelectedForecastHour);
  const selectedVariantIndex = useMapStore((s) => s.selectedVariantIndex);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const diff = DIFFICULTY_LABELS[tour.difficulty];
  const ates = ATES_LABELS[tour.ates_rating];
  const aspects = tour.variants.flatMap((v) => v.primary_aspects);
  const uniqueAspects = [...new Set(aspects)];
  const variant = tour.variants[selectedVariantIndex] ?? tour.variants[0];

  const tourDurationHours = Math.round(
    (tour.estimated_hours_range[0] + tour.estimated_hours_range[1]) / 2,
  );

  const conditionsAssessment = useMemo(() => {
    const zone = avyData?.zones?.[0] ?? null;
    const detailed = avyData?.detailed ?? null;
    return assessConditions(forecast ?? null, { detailed, zone }, tour, variant, selectedHour);
  }, [forecast, avyData, tour, variant, selectedHour]);

  const allWindows = useMemo(() => {
    if (!forecast) return [];
    const { windows } = analyzeTiming(forecast, tour);
    return windows;
  }, [forecast, tour]);

  return (
    <div className="pb-4">
      {/* Tour header */}
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{tour.name}</h3>
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

        {/* Quick stats row with inline Route Details toggle */}
        <div className="mt-1.5 flex items-center gap-x-3 text-[11px] text-gray-500">
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className={`h-3 w-3 transition-transform duration-150 ${detailsOpen ? 'rotate-90' : ''}`}
            >
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            Details
          </button>
          <span>{kmToMiles(tour.distance_km)} mi</span>
          <span>{metersToFeet(tour.elevation_gain_m).toLocaleString()}&apos; gain</span>
          <span>
            {tour.estimated_hours_range[0]}-{tour.estimated_hours_range[1]} hrs
          </span>
          <span>{uniqueAspects.join(', ')}</span>
        </div>
      </div>

      {/* Route details content — toggled by the inline Details button above */}
      {detailsOpen && (
      <div className="mx-4 mt-1 rounded-xl ring-1 ring-gray-100">

        <div className="space-y-3 px-3 py-3">
          {/* Description */}
          <p className="text-xs leading-relaxed text-gray-600">{tour.description}</p>

          {/* Seasonal notes */}
          <p className="text-[11px] italic text-gray-500">{tour.seasonal_notes}</p>

          {/* Stats grid */}
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
                <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">
                  {tour.terrain_traps.length}
                </span>
              </p>
              <ul className="mt-1 space-y-0.5">
                {tour.terrain_traps.map((trap, i) => (
                  <li key={i} className="text-[11px] text-gray-600">
                    <span className="text-orange-500">{'\u26A0'}</span> {trap.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Overhead hazards */}
          {tour.overhead_hazards.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Overhead Hazards
                <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                  {tour.overhead_hazards.length}
                </span>
              </p>
              <ul className="mt-1 space-y-0.5">
                {tour.overhead_hazards.map((hz, i) => (
                  <li key={i} className="text-[11px] text-gray-600">
                    <span className="text-red-500">{'\u26A0'}</span> {hz.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Escape routes */}
          {tour.escape_routes.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Escape Routes
              </p>
              <ul className="mt-1 space-y-0.5">
                {tour.escape_routes.map((route, i) => (
                  <li key={i} className="text-[11px] text-gray-600">{route}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parking / trailhead */}
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
            <a
              href={`https://maps.google.com/?daddr=${(tour.trailhead.geometry.coordinates as [number, number])[1]},${(tour.trailhead.geometry.coordinates as [number, number])[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>
      )}

      {/* Timeline — same component as main page, shares Zustand state */}
      {!hideTimeline && (
        forecast ? (
          <div className="mx-4 mt-3">
            <OverviewTimeline
              forecast={forecast}
              tour={tour}
              selectedHour={selectedHour}
              onSelectHour={setSelectedHour}
            />
          </div>
        ) : weatherLoading ? (
          <div className="mx-4 mt-3 h-16 animate-pulse rounded-xl bg-gray-100" />
        ) : null
      )}

      {/* Unified conditions card */}
      <div className="mx-4 mt-3 rounded-xl bg-white shadow-sm ring-1 ring-gray-100" data-tour-step="conditions-score">
        {weatherLoading ? (
          <div className="flex items-center gap-3 px-4 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <span className="text-xs text-gray-500">Loading conditions data...</span>
          </div>
        ) : (
          <div>
        {/* Score header: band color bar + score + label */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={conditionsAssessment.composite}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Conditions score: ${conditionsAssessment.composite} out of 100`}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${conditionsAssessment.composite}%`, backgroundColor: conditionsAssessment.bandColor }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color: conditionsAssessment.bandColor }}>
                {conditionsAssessment.composite}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold" style={{ color: conditionsAssessment.bandColor }}>
              {conditionsAssessment.bandLabel}
            </p>
          </div>
          {/* Dimension pills */}
          <div className="flex flex-col gap-0.5 text-[9px]">
            {conditionsAssessment.avalanche != null && (
              <DimensionRow label="Avy" score={conditionsAssessment.avalanche} />
            )}
            <DimensionRow label="Wx" score={conditionsAssessment.weather} />
            <DimensionRow label="Terr" score={conditionsAssessment.terrain} />
          </div>
        </div>

        {/* Key reasons */}
        {conditionsAssessment.reasons.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-2">
            {conditionsAssessment.reasons.map((r, i) => (
              <p key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                <span className="mt-px text-gray-300">{'\u2022'}</span>
                {r}
              </p>
            ))}
          </div>
        )}

        {/* Avalanche danger inline */}
        <div className="border-t border-gray-100" data-tour-step="avy-danger">
          <AvyDangerBanner selectedTime={selectedHour != null && forecast ? forecast.hourly[selectedHour]?.time ?? null : null} inline />
        </div>

        {/* Favorable windows / selected window */}
        {forecast && (
          <div className="border-t border-gray-100">
            <FavorableWindowsBox
              windows={allWindows}
              forecast={forecast}
              tour={tour}
              selectedHour={selectedHour}
              tourDurationHours={tourDurationHours}
              onSelectHour={setSelectedHour}
            />
          </div>
        )}
        </div>
        )}
      </div>

      {/* Dynamic conditions — always visible below the accordion */}
      <div className="border-t border-gray-100">
        <WeatherSummary tour={tour} compact />
      </div>

      {tour.variants.length > 1 && (
        <div className="border-t border-gray-100">
          <VariantSelector tour={tour} />
        </div>
      )}

      {/* SAC forecast link */}
      <div className="mt-3 px-4">
        <a
          href="https://www.sierraavalanchecenter.org/forecasts/avalanche"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[11px] font-medium text-blue-600 hover:text-blue-800"
        >
          View Full SAC Avalanche Forecast &rarr;
        </a>
      </div>

      {/* Full dashboard link + share */}
      <div className="mt-2 flex gap-2 px-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            router.push(`/tour/${tour.slug}`);
          }}
          className="block flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
        >
          View Full Conditions Dashboard
        </button>
        <ShareButton tourName={tour.name} />
      </div>
    </div>
  );
}

function ShareButton({ tourName }: { tourName: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('shared', '1');
    const url = shareUrl.toString();
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
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleShare();
      }}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
      aria-label="Share conditions link"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

function DimensionRow({ label, score }: { label: string; score: number }) {
  let scoreColor = '#16A34A'; // green
  if (score < 40) scoreColor = '#EF4444'; // red
  else if (score < 60) scoreColor = '#F7941E'; // orange
  else if (score < 80) scoreColor = '#EAB308'; // yellow

  return (
    <span className="flex items-center gap-1 text-gray-400">
      {label}
      <span className="font-bold tabular-nums" style={{ color: scoreColor }}>
        {score}
      </span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  );
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Advance an ISO time string by 1 hour (for displaying inclusive window end times). */
function advanceOneHour(iso: string): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now.getTime() + 86400000);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Categorize a reason string so we can deduplicate by category.
 * Within a category, keep the most severe (last seen from worst-favorability window).
 */
function reasonCategory(reason: string): string {
  if (reason.startsWith('Ridge winds') || reason === 'Light winds') return 'wind';
  if (reason.includes('precipitation') || reason === 'Dry') return 'precip';
  if (reason.includes('Rain-on-snow') || reason.includes('freezing level')) return 'freezing';
  if (reason.includes('visibility') || reason.includes('Visibility')) return 'visibility';
  if (reason.includes('Nighttime')) return 'nighttime';
  return reason; // unique category for anything else
}

/**
 * Collect reasons from timing windows, keeping only one per category.
 * For contradictory pairs (e.g. "Light winds" + "Ridge winds 12 mph"),
 * the worse condition wins.
 */
function deduplicateReasons(
  windowList: ReturnType<typeof analyzeTiming>['windows'],
  maxReasons: number,
): string[] {
  // Priority: less > caution > more (worse conditions override better)
  const priority: Record<string, number> = { less: 2, caution: 1, more: 0 };
  const byCategory = new Map<string, { reason: string; severity: number }>();

  // Process windows from worst to best so worse reasons stick
  const sorted = [...windowList].sort(
    (a, b) => (priority[b.favorability] ?? 0) - (priority[a.favorability] ?? 0),
  );

  for (const w of sorted) {
    const sev = priority[w.favorability] ?? 0;
    for (const r of w.reasons) {
      if (r.includes('Nighttime')) continue;
      const cat = reasonCategory(r);
      const existing = byCategory.get(cat);
      if (!existing || sev > existing.severity) {
        byCategory.set(cat, { reason: r, severity: sev });
      }
    }
  }

  return Array.from(byCategory.values())
    .map((v) => v.reason)
    .slice(0, maxReasons);
}

function FavorableWindowsBox({
  windows,
  forecast,
  tour,
  selectedHour,
  tourDurationHours,
  onSelectHour,
}: {
  windows: ReturnType<typeof analyzeTiming>['windows'];
  forecast: WeatherForecast;
  tour: Tour;
  selectedHour: number | null;
  tourDurationHours: number;
  onSelectHour: (hour: number | null) => void;
}) {
  // Determine the current hour index so we can hide windows that have already ended
  const nowIdx = useMemo(() => {
    const now = Date.now();
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < forecast.hourly.length; i++) {
      const diff = Math.abs(new Date(forecast.hourly[i].time).getTime() - now);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return best;
  }, [forecast.hourly]);

  const favorable = windows.filter((w) => w.favorability === 'more' && w.endHour >= nowIdx);
  const unfavorable = windows.filter((w) => w.favorability === 'less');
  const caution = windows.filter((w) => w.favorability === 'caution');

  // Collect the top reasons driving unfavorable conditions (deduped by category)
  const unfavorableReasons = deduplicateReasons([...unfavorable, ...caution], 4);

  // When a time is selected, assess each hour directly for accurate reasons
  if (selectedHour != null) {
    const selEnd = Math.min(selectedHour + tourDurationHours - 1, forecast.hourly.length - 1);
    const startIso = forecast.hourly[selectedHour]?.time;
    const endIso = forecast.hourly[selEnd]?.time;

    if (!startIso || !endIso) return null;

    const endDisplayIso = advanceOneHour(endIso);
    const startDay = getDayLabel(startIso);
    const endDay = getDayLabel(endDisplayIso);
    const sameDay = startDay === endDay;

    const tourMaxFt = metersToFeet(tour.max_elevation_m);
    const tourMinFt = metersToFeet(tour.min_elevation_m);

    // Assess each individual hour in the selected range
    let favorableHours = 0;
    let cautionHours = 0;
    let unfavorableHours = 0;
    const hourAssessments: ReturnType<typeof analyzeTiming>['windows'] = [];

    for (let i = selectedHour; i <= selEnd; i++) {
      const h = forecast.hourly[i];
      if (!h) continue;
      const result = assessHour(h, tourMaxFt, tourMinFt);
      if (result.favorability === 'more') favorableHours++;
      else if (result.favorability === 'caution') cautionHours++;
      else unfavorableHours++;
      // Wrap as a pseudo-window for deduplicateReasons
      hourAssessments.push({
        startHour: i,
        endHour: i,
        favorability: result.favorability,
        reasons: result.reasons,
      });
    }

    // Deduplicate reasons by category — worst condition wins
    const selectedReasons = deduplicateReasons(hourAssessments, 5);

    // Determine overall assessment for the selected window
    const totalHours = selEnd - selectedHour + 1;
    const isMostlyFavorable = favorableHours >= totalHours * 0.7;
    const isMostlyUnfavorable = unfavorableHours >= totalHours * 0.5;

    const bgColor = isMostlyFavorable
      ? 'bg-green-50'
      : isMostlyUnfavorable
        ? 'bg-red-50'
        : 'bg-amber-50';
    const headerColor = isMostlyFavorable
      ? 'text-green-800'
      : isMostlyUnfavorable
        ? 'text-red-800'
        : 'text-amber-800';
    const assessment = isMostlyFavorable
      ? 'More favorable conditions'
      : isMostlyUnfavorable
        ? 'Less favorable conditions'
        : 'Mixed conditions — use caution';
    const reasonColor = isMostlyFavorable
      ? 'text-green-600'
      : isMostlyUnfavorable
        ? 'text-red-600'
        : 'text-amber-600';
    const dotColor = isMostlyFavorable
      ? 'text-green-400'
      : isMostlyUnfavorable
        ? 'text-red-400'
        : 'text-amber-400';

    return (
      <div className="px-4 py-3">
        <div className={`rounded-lg ${bgColor} px-3 py-2.5`}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Selected window
          </p>
          <p className={`text-xs font-semibold ${headerColor}`}>
            {startDay} {formatHourLabel(startIso)} – {sameDay ? '' : `${endDay} `}
            {formatHourLabel(endDisplayIso)}
          </p>
          <p className={`mt-0.5 text-[11px] font-medium ${headerColor}`}>{assessment}</p>

          {selectedReasons.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {selectedReasons.map((r, i) => (
                <p key={i} className={`flex items-start gap-1.5 text-[11px] ${reasonColor}`}>
                  <span className={`mt-px ${dotColor}`}>&#9679;</span>
                  {r}
                </p>
              ))}
            </div>
          )}

          {/* Breakdown bar */}
          {totalHours > 1 && (
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
              {favorableHours > 0 && (
                <div
                  className="bg-green-400"
                  style={{ width: `${(favorableHours / totalHours) * 100}%` }}
                />
              )}
              {cautionHours > 0 && (
                <div
                  className="bg-amber-400"
                  style={{ width: `${(cautionHours / totalHours) * 100}%` }}
                />
              )}
              {unfavorableHours > 0 && (
                <div
                  className="bg-red-400"
                  style={{ width: `${(unfavorableHours / totalHours) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No selection — show all favorable windows (existing behavior)
  if (favorable.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="rounded-lg bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">No favorable touring windows</p>
          <p className="mt-1 text-[11px] text-amber-700">
            Current conditions are unfavorable across the 72-hour forecast.
          </p>
          {unfavorableReasons.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600">
                Contributing factors
              </p>
              {unfavorableReasons.map((r, i) => (
                <p key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                  <span className="mt-px text-amber-400">&#9679;</span>
                  {r}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="rounded-lg bg-green-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-green-800">Favorable touring windows</p>
        <p className="mt-0.5 text-[10px] text-green-600">Click a window to preview on map</p>
        <div className="mt-1.5 space-y-1.5">
          {favorable.slice(0, 4).map((w, i) => {
            const startIso = forecast.hourly[w.startHour]?.time;
            const endIso = forecast.hourly[w.endHour]?.time;
            if (!startIso || !endIso) return null;

            const endDisplayIso = advanceOneHour(endIso);
            const startDay = getDayLabel(startIso);
            const endDay = getDayLabel(endDisplayIso);
            const sameDay = startDay === endDay;
            const hours = w.endHour - w.startHour + 1;

            return (
              <button
                key={i}
                onClick={() => onSelectHour(w.startHour)}
                className="flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-green-100"
              >
                <span className="mt-0.5 text-green-500">&#9679;</span>
                <div>
                  <p className="text-[11px] font-medium text-green-800">
                    {startDay} {formatHourLabel(startIso)} – {sameDay ? '' : `${endDay} `}
                    {formatHourLabel(endDisplayIso)}
                    <span className="ml-1 font-normal text-green-600">({hours}h)</span>
                  </p>
                  <p className="text-[10px] text-green-600">
                    {w.reasons.slice(0, 2).join(' \u00B7 ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {unfavorableReasons.length > 0 && (
          <div className="mt-2 border-t border-green-200 pt-2">
            <p className="text-[10px] font-medium text-amber-700">
              Outside these windows:
            </p>
            <p className="mt-0.5 text-[10px] text-amber-600">
              {unfavorableReasons.slice(0, 3).join(' \u00B7 ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
