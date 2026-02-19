import { NextResponse } from 'next/server';
import type { GridPrecipPoint, GridPrecipData } from '@/lib/types/conditions';

/** When OPEN_METEO_API_KEY is set, use the paid customer endpoint. */
const OPEN_METEO_BASE = process.env.OPEN_METEO_API_KEY
  ? 'https://customer-api.open-meteo.com/v1/forecast'
  : 'https://api.open-meteo.com/v1/forecast';

/**
 * Accepts bounding box query params to build a fine-grained precipitation grid
 * scoped to a specific area (e.g. 2-mile buffer around a tour route).
 *
 * Query params:
 *   latMin, latMax, lngMin, lngMax — bounding box
 *   step — grid spacing in degrees (default 0.005 ≈ 550m)
 *   hour — optional hourly index (0-71) into the 72-hour forecast.
 *          When absent, uses the current hour.
 *
 * Falls back to a coarse full-map grid when no bbox is provided.
 */

/** Full-map fallback bounds (coarse grid). */
const FULL_LAT_MIN = 38.0;
const FULL_LAT_MAX = 40.0;
const FULL_LNG_MIN = -121.5;
const FULL_LNG_MAX = -119.0;
const FULL_STEP = 0.15;

/** Build parallel lat/lng arrays for a grid within the given bounds. */
function buildGridCoords(
  latMin: number,
  latMax: number,
  lngMin: number,
  lngMax: number,
  step: number,
): { lats: number[]; lngs: number[] } {
  const lats: number[] = [];
  const lngs: number[] = [];

  // Round step precision to avoid floating-point drift
  const precision = Math.max(2, -Math.floor(Math.log10(step)) + 1);
  const factor = 10 ** precision;

  for (let lat = latMin; lat <= latMax; lat = Math.round((lat + step) * factor) / factor) {
    for (let lng = lngMin; lng <= lngMax; lng = Math.round((lng + step) * factor) / factor) {
      lats.push(lat);
      lngs.push(lng);
    }
  }

  return { lats, lngs };
}

/** Find the hourly index closest to now within a time array. */
function findCurrentHourIndex(times: string[]): number {
  const now = Date.now();
  let closest = 0;
  let minDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }

  return closest;
}

/** Max points per request to stay under URL length limits. */
const BATCH_SIZE = 400;

/** Fetch a batch of grid points from Open-Meteo. */
async function fetchBatch(
  batchLats: number[],
  batchLngs: number[],
): Promise<Array<Record<string, unknown>>> {
  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set('latitude', batchLats.join(','));
  url.searchParams.set('longitude', batchLngs.join(','));
  url.searchParams.set('hourly', 'precipitation,snowfall,freezing_level_height,wind_speed_10m,wind_speed_80m,wind_direction_10m,snow_depth');
  url.searchParams.set('past_days', '2');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'America/Los_Angeles');

  if (process.env.OPEN_METEO_API_KEY) {
    url.searchParams.set('apikey', process.env.OPEN_METEO_API_KEY);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });

  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}`);
  }

  const raw = await res.json();
  return Array.isArray(raw) ? raw : [raw];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Use bbox params if provided, otherwise fall back to full-map coarse grid
  const hasBbox = searchParams.has('latMin');
  const latMin = hasBbox ? parseFloat(searchParams.get('latMin')!) : FULL_LAT_MIN;
  const latMax = hasBbox ? parseFloat(searchParams.get('latMax')!) : FULL_LAT_MAX;
  const lngMin = hasBbox ? parseFloat(searchParams.get('lngMin')!) : FULL_LNG_MIN;
  const lngMax = hasBbox ? parseFloat(searchParams.get('lngMax')!) : FULL_LNG_MAX;
  const step = hasBbox
    ? parseFloat(searchParams.get('step') || '0.005')
    : FULL_STEP;

  // Safety: cap at 1000 points
  const estPoints =
    Math.ceil((latMax - latMin) / step + 1) * Math.ceil((lngMax - lngMin) / step + 1);
  if (estPoints > 1000) {
    return NextResponse.json(
      { error: `Grid too dense: ${estPoints} points (max 1000). Increase step or shrink bbox.` },
      { status: 400 },
    );
  }

  const { lats, lngs } = buildGridCoords(latMin, latMax, lngMin, lngMax, step);

  // Optional hour index (0-47) — when provided, return that forecast hour
  // instead of the current hour
  const hourParam = searchParams.get('hour');
  const requestedHour = hourParam != null ? parseInt(hourParam, 10) : null;

  try {
    // Split into batches (sequential to avoid Open-Meteo rate limits)
    const allResults: Array<Record<string, unknown>> = [];

    for (let i = 0; i < lats.length; i += BATCH_SIZE) {
      const batch = await fetchBatch(
        lats.slice(i, i + BATCH_SIZE),
        lngs.slice(i, i + BATCH_SIZE),
      );
      allResults.push(...batch);
    }

    const points: GridPrecipPoint[] = allResults.map((loc, i) => {
      const hourly = loc.hourly as Record<string, unknown[]>;
      const times = hourly.time as string[];
      const snowfallArr = hourly.snowfall as number[];

      // With past_days=2 + forecast_days=3, we have 120 hours.
      // The first ~48 are past, the rest are forecast.
      // The `hour` param (0-71) refers to forecast-relative indices,
      // so we offset by the number of past hours (48).
      const PAST_HOURS = 48;
      const currentIdx = findCurrentHourIndex(times);
      const idx = requestedHour != null && requestedHour >= 0
        ? Math.min(requestedHour + PAST_HOURS, times.length - 1)
        : currentIdx;

      // Sum snowfall over the 48 hours ending at `idx`
      let snowfall48h = 0;
      const startIdx = Math.max(0, idx - 47);
      for (let j = startIdx; j <= idx; j++) {
        snowfall48h += snowfallArr[j] ?? 0;
      }

      return {
        lat: loc.latitude as number,
        lng: loc.longitude as number,
        reqLat: lats[i],
        reqLng: lngs[i],
        precipitation: (hourly.precipitation as number[])[idx],
        snowfall: snowfallArr[idx],
        freezing_level_height: (hourly.freezing_level_height as number[])[idx],
        wind_speed_10m: (hourly.wind_speed_10m as number[])[idx],
        wind_speed_80m: (hourly.wind_speed_80m as number[])[idx],
        wind_direction_10m: (hourly.wind_direction_10m as number[])[idx],
        snow_depth: (hourly.snow_depth as number[])[idx],
        snowfall_48h: snowfall48h,
        elevation: loc.elevation as number,
      };
    });

    const data: GridPrecipData = {
      points,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch grid weather data' },
      { status: 502 },
    );
  }
}
