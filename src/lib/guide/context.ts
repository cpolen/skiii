import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';
import type { WeatherForecast } from '@/lib/types/conditions';
import type { AvyForecastResponse } from '@/hooks/useAvyForecast';
import type { GuideTrigger } from '@/stores/guide';
import { tours } from '@/data/tours';
import { celsiusToFahrenheit, kmhToMph, metersToFeet } from '@/lib/types/conditions';
import { getCurrentHour } from '@/hooks/useWeather';
import type {
  AppLoadContext,
  TourSelectContext,
  TimelineScrubContext,
} from './templates';

// ---------------------------------------------------------------------------
// Payload for AI API (superset of template contexts)
// ---------------------------------------------------------------------------

export interface GuidePayload {
  trigger: GuideTrigger;
  tourName: string | null;
  tourSlug: string | null;
  rank: number | null;
  totalTours: number;
  forecastHour: number | null;
  conditions: {
    composite: number;
    band: string;
    bandLabel: string;
    reasons: string[];
    avalancheScore: number | null;
    weatherScore: number;
    terrainScore: number;
  } | null;
  snow: {
    type: string;
    label: string;
    detail: string;
    score?: number;
    cornWindowStart?: string;
    cornWindowEnd?: string;
    startBy?: string;
  } | null;
  weather: {
    tempF: number;
    ridgeWindMph: number;
    windDirection: string;
    precipMm: number;
    snowfallCm: number;
    snowfall48hIn: number;
    freezingLevelFt: number;
    visibilityM: number;
    isDay: boolean;
  } | null;
  avy: {
    dangerLevel: number | null;
    problems: string[];
    travelAdvice: string | null;
    bottomLine: string | null;
  } | null;
  terrain: {
    atesRating: string;
    difficulty: string;
    maxSlope: number;
    terrainTraps: string[];
    overheadHazards: string[];
    escapeRoutes: string[];
    aspects: string[];
    elevationRange: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Context key for deduplication
// ---------------------------------------------------------------------------

export function contextKey(trigger: GuideTrigger, tourSlug: string | null, forecastHour: number | null): string {
  return `${trigger}:${tourSlug ?? 'none'}:${forecastHour ?? 'now'}`;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface TourConditionEntry {
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading: boolean;
}

/** Compass direction from degrees */
function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Accumulate snowfall over past 48h from forecast hourly data */
function getSnowfall48h(forecast: WeatherForecast, refIndex: number): number {
  const refMs = new Date(forecast.hourly[refIndex].time).getTime();
  const h48ago = refMs - 48 * 3600 * 1000;
  let total = 0;
  for (const h of forecast.hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break;
    if (t < h48ago) continue;
    total += h.snowfall;
  }
  return Math.round(total / 2.54); // cm -> inches
}

/** Get avy problems that overlap with a tour's aspects */
function getOverlappingProblems(
  avyData: AvyForecastResponse | undefined,
  tourIdx: number,
): string[] {
  const detailed = avyData?.detailed;
  if (!detailed?.problems) return [];
  const tour = tours[tourIdx];
  const variant = tour?.variants[0];
  if (!variant) return [];

  const tourAspects = new Set(variant.primary_aspects);
  const result: string[] = [];

  for (const p of detailed.problems) {
    // Check if problem locations overlap with tour aspects
    const overlaps = p.location.some((loc) => {
      const dir = loc.split(' ')[0];
      const dirMap: Record<string, string> = {
        north: 'N', northeast: 'NE', east: 'E', southeast: 'SE',
        south: 'S', southwest: 'SW', west: 'W', northwest: 'NW',
      };
      return tourAspects.has(dirMap[dir] as typeof variant.primary_aspects[number]);
    });
    if (overlaps) {
      result.push(`${p.name} (${p.likelihood})`);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Build template-specific contexts from computed data
// ---------------------------------------------------------------------------

export function buildAppLoadContext(
  sortedTourIndices: number[],
  tourConditions: TourConditionEntry[],
  weatherQueries: { data?: WeatherForecast }[],
  avyData: AvyForecastResponse | undefined,
): AppLoadContext | null {
  const topIdx = sortedTourIndices[0];
  if (topIdx == null) return null;

  const entry = tourConditions[topIdx];
  if (!entry?.conditions || !entry?.snowType) return null;

  const forecast = weatherQueries[topIdx]?.data;
  if (!forecast) return null;

  const currentHour = getCurrentHour(forecast);
  const zone = avyData?.zones?.[0] ?? null;
  const currentIdx = forecast.hourly.indexOf(currentHour);

  return {
    topTourName: tours[topIdx].name,
    conditions: entry.conditions,
    snow: entry.snowType,
    avyDangerLevel: zone?.off_season ? null : (zone?.danger_level ?? null),
    avyProblems: getOverlappingProblems(avyData, topIdx),
    tempF: Math.round(celsiusToFahrenheit(currentHour.temperature_2m)),
    ridgeWindMph: Math.round(kmhToMph(currentHour.wind_speed_80m)),
    freezingLevelFt: Math.round(metersToFeet(currentHour.freezing_level_height)),
    snowfall48hIn: currentIdx >= 0 ? getSnowfall48h(forecast, currentIdx) : 0,
  };
}

export function buildTourSelectContext(
  tourSlug: string,
  sortedTourIndices: number[],
  tourConditions: TourConditionEntry[],
  weatherQueries: { data?: WeatherForecast }[],
  avyData: AvyForecastResponse | undefined,
  forecastHour: number | null,
): TourSelectContext | null {
  const tourIdx = tours.findIndex((t) => t.slug === tourSlug);
  if (tourIdx < 0) return null;

  const entry = tourConditions[tourIdx];
  if (!entry?.conditions || !entry?.snowType) return null;

  const rank = sortedTourIndices.indexOf(tourIdx) + 1;
  const tour = tours[tourIdx];
  const variant = tour.variants[0];
  const forecast = weatherQueries[tourIdx]?.data;
  const zone = avyData?.zones?.[0] ?? null;

  // Get weather at current/selected hour
  const hour = forecast
    ? (forecastHour != null ? forecast.hourly[forecastHour] : getCurrentHour(forecast))
    : null;

  return {
    tourName: tour.name,
    conditions: entry.conditions,
    snow: entry.snowType,
    rank: rank > 0 ? rank : tours.length,
    totalTours: tours.length,
    tempF: hour ? Math.round(celsiusToFahrenheit(hour.temperature_2m)) : 0,
    ridgeWindMph: hour ? Math.round(kmhToMph(hour.wind_speed_80m)) : 0,
    avyDangerLevel: zone?.off_season ? null : (zone?.danger_level ?? null),
    avyProblems: getOverlappingProblems(avyData, tourIdx),
    atesRating: tour.ates_rating,
    terrainTraps: tour.terrain_traps.map((t) => t.description),
    aspects: variant?.primary_aspects ?? [],
  };
}

export function buildTimelineScrubContext(
  tourSlug: string | null,
  forecastHour: number,
  sortedTourIndices: number[],
  tourConditions: TourConditionEntry[],
  weatherQueries: { data?: WeatherForecast }[],
  previousComposite: number | null,
): TimelineScrubContext | null {
  // Use the selected tour if available, otherwise the top tour
  const idx = tourSlug
    ? tours.findIndex((t) => t.slug === tourSlug)
    : sortedTourIndices[0];
  if (idx == null || idx < 0) return null;

  const entry = tourConditions[idx];
  if (!entry?.conditions || !entry?.snowType) return null;

  // Get the actual hour label and weather from the forecast data
  const forecast = weatherQueries[idx]?.data;
  const hourLabel = formatForecastHour(forecast, forecastHour);
  const hour = forecast?.hourly[forecastHour];

  return {
    tourName: tourSlug ? tours[idx].name : null,
    hourLabel,
    conditions: entry.conditions,
    snow: entry.snowType,
    previousComposite,
    tempF: hour ? Math.round(celsiusToFahrenheit(hour.temperature_2m)) : 0,
    ridgeWindMph: hour ? Math.round(kmhToMph(hour.wind_speed_80m)) : 0,
    precipMm: hour?.precipitation ?? 0,
    freezingLevelFt: hour ? Math.round(metersToFeet(hour.freezing_level_height)) : 0,
  };
}

/** Format a forecast hour index into a readable time label using actual forecast timestamps. */
function formatForecastHour(forecast: WeatherForecast | undefined, index: number): string {
  if (forecast?.hourly[index]) {
    const date = new Date(forecast.hourly[index].time);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  }
  // Fallback: estimate from current time
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + index);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

// ---------------------------------------------------------------------------
// Strip HTML tags for plain text (for avy bottom_line)
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Build AI payload
// ---------------------------------------------------------------------------

export function buildGuidePayload(
  trigger: GuideTrigger,
  tourSlug: string | null,
  forecastHour: number | null,
  sortedTourIndices: number[],
  tourConditions: TourConditionEntry[],
  weatherQueries: { data?: WeatherForecast }[],
  avyData: AvyForecastResponse | undefined,
): GuidePayload {
  // Determine which tour to describe
  const idx = tourSlug
    ? tours.findIndex((t) => t.slug === tourSlug)
    : sortedTourIndices[0];

  const tour = idx != null && idx >= 0 ? tours[idx] : null;
  const entry = idx != null && idx >= 0 ? tourConditions[idx] : null;
  const forecast = idx != null && idx >= 0 ? weatherQueries[idx]?.data : null;
  const zone = avyData?.zones?.[0] ?? null;
  const detailed = avyData?.detailed ?? null;

  // Pick the relevant hour from forecast
  const hour = forecast
    ? (forecastHour != null ? forecast.hourly[forecastHour] : getCurrentHour(forecast))
    : null;

  // Compute 48h snowfall
  const refIdx = forecast
    ? (forecastHour != null ? forecastHour : forecast.hourly.indexOf(getCurrentHour(forecast)))
    : -1;
  const snowfall48hIn = forecast && refIdx >= 0 ? getSnowfall48h(forecast, refIdx) : 0;

  const rank = idx != null && idx >= 0 ? sortedTourIndices.indexOf(idx) + 1 : null;
  const variant = tour?.variants[0];

  return {
    trigger,
    tourName: tour?.name ?? null,
    tourSlug: tour?.slug ?? null,
    rank: rank && rank > 0 ? rank : null,
    totalTours: tours.length,
    forecastHour,
    conditions: entry?.conditions ? {
      composite: entry.conditions.composite,
      band: entry.conditions.band,
      bandLabel: entry.conditions.bandLabel,
      reasons: entry.conditions.reasons,
      avalancheScore: entry.conditions.avalanche,
      weatherScore: entry.conditions.weather,
      terrainScore: entry.conditions.terrain,
    } : null,
    snow: entry?.snowType ? {
      type: entry.snowType.type,
      label: entry.snowType.label,
      detail: entry.snowType.detail,
      score: entry.snowType.score,
      cornWindowStart: entry.snowType.cornWindowStart,
      cornWindowEnd: entry.snowType.cornWindowEnd,
      startBy: entry.snowType.startBy,
    } : null,
    weather: hour ? {
      tempF: Math.round(celsiusToFahrenheit(hour.temperature_2m)),
      ridgeWindMph: Math.round(kmhToMph(hour.wind_speed_80m)),
      windDirection: windDirectionLabel(hour.wind_direction_80m),
      precipMm: hour.precipitation,
      snowfallCm: hour.snowfall,
      snowfall48hIn,
      freezingLevelFt: Math.round(metersToFeet(hour.freezing_level_height)),
      visibilityM: hour.visibility,
      isDay: hour.is_day,
    } : null,
    avy: zone ? {
      dangerLevel: zone.off_season ? null : zone.danger_level,
      problems: getOverlappingProblems(avyData, idx!),
      travelAdvice: zone.travel_advice || null,
      bottomLine: detailed?.bottom_line ? stripHtml(detailed.bottom_line) : null,
    } : null,
    terrain: tour && variant ? {
      atesRating: tour.ates_rating,
      difficulty: tour.difficulty,
      maxSlope: variant.slope_angle_max,
      terrainTraps: tour.terrain_traps.map((t) => t.description),
      overheadHazards: tour.overhead_hazards.map((h) => h.description),
      escapeRoutes: tour.escape_routes,
      aspects: variant.primary_aspects,
      elevationRange: `${Math.round(metersToFeet(tour.min_elevation_m)).toLocaleString()}'–${Math.round(metersToFeet(tour.max_elevation_m)).toLocaleString()}'`,
    } : null,
  };
}
