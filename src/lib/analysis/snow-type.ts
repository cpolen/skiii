import type { WeatherForecast, HourlyWeather } from '@/lib/types/conditions';
import type { Tour, TourVariant } from '@/lib/types/tour';
import { kmhToMph, celsiusToFahrenheit } from '@/lib/types/conditions';
import { getSunPosition } from './solar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SnowType =
  | 'powder'
  | 'corn'
  | 'wind-affected'
  | 'crust'
  | 'packed-powder'
  | 'spring-snow'
  | 'variable'
  | 'wind-scoured'
  | 'softening'
  | 'firm';

export interface SnowClassification {
  type: SnowType;
  label: string;
  emoji: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Aspect-to-bearing mapping for corn solar checks
// ---------------------------------------------------------------------------

const ASPECT_BEARING: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

/**
 * Check if the sun's azimuth is illuminating slopes of the given aspect.
 * Sun azimuth must be within ~60° of the aspect's bearing for meaningful
 * solar warming.
 */
function sunHitsAspect(sunAzimuth: number, aspectBearing: number): boolean {
  let diff = Math.abs(sunAzimuth - aspectBearing);
  if (diff > 180) diff = 360 - diff;
  return diff <= 60;
}

// ---------------------------------------------------------------------------
// Classification algorithm
// ---------------------------------------------------------------------------

/**
 * Classify the dominant snow type for a tour/variant based on the 72-hour
 * forecast. Checks run in priority order — first match wins.
 *
 * @param selectedHour  Optional index into the forecast hourly array.
 *                      When provided, analysis is relative to that hour
 *                      instead of "now".
 */
export function classifySnow(
  forecast: WeatherForecast | null,
  tour: Tour,
  variant: TourVariant,
  selectedHour?: number | null,
): SnowClassification {
  if (!forecast || forecast.hourly.length === 0) {
    return { type: 'firm', label: 'Firm', emoji: '🏔️', detail: 'No forecast data' };
  }

  const hourly = forecast.hourly;

  // Determine reference index: selected hour if provided, otherwise closest to now
  let currentIdx: number;
  if (selectedHour != null && selectedHour >= 0 && selectedHour < hourly.length) {
    currentIdx = selectedHour;
  } else {
    const nowMs = Date.now();
    currentIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < hourly.length; i++) {
      const diff = Math.abs(new Date(hourly[i].time).getTime() - nowMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        currentIdx = i;
      }
    }
  }

  const refMs = new Date(hourly[currentIdx].time).getTime();

  // Accumulate snowfall and precip over past 48 hours relative to reference time
  const h48ago = refMs - 48 * 3600 * 1000;
  let snowfall48h = 0;
  let hadRainOnSnow = false;
  let tempCrossings = 0;
  let prevAboveFreezing: boolean | null = null;

  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break; // only look at hours up to reference time
    if (t < h48ago) continue;

    snowfall48h += h.snowfall; // cm/hr accumulated

    // Check rain-on-snow: precip while freezing level above tour max
    const freezingM = h.freezing_level_height;
    if (h.precipitation > 0 && freezingM > tour.max_elevation_m) {
      hadRainOnSnow = true;
    }

    // Count temperature crossings around 0°C
    const aboveFreezing = h.temperature_2m > 0;
    if (prevAboveFreezing !== null && aboveFreezing !== prevAboveFreezing) {
      tempCrossings++;
    }
    prevAboveFreezing = aboveFreezing;
  }

  const snowfall48hInches = Math.round(snowfall48h / 2.54);
  const currentHour = hourly[currentIdx];
  const currentTempF = Math.round(celsiusToFahrenheit(currentHour.temperature_2m));
  const ridgeWindMph = kmhToMph(currentHour.wind_speed_80m);

  // Elevation-adjusted temperature estimate: lapse rate ~3.5°F per 1000ft
  const tourMidElevFt = ((tour.min_elevation_m + tour.max_elevation_m) / 2) * 3.28084;
  const forecastElevFt = forecast.elevation * 3.28084;
  const elevDiffFt = tourMidElevFt - forecastElevFt;
  const tourTempF = Math.round(currentTempF - (elevDiffFt / 1000) * 3.5);

  // 1. Powder check
  if (
    snowfall48h > 15 && // >15cm (~6") in 48h
    currentHour.temperature_2m < 0 && // currently below freezing
    ridgeWindMph < 25 // not wind-packed
  ) {
    return {
      type: 'powder',
      label: 'Powder',
      emoji: '❄️',
      detail: `${snowfall48hInches}" new in 48h`,
    };
  }

  // 2. Corn check (aspect-specific spring cycle)
  const cornResult = checkCorn(forecast, tour, variant, currentIdx, refMs);
  if (cornResult) return cornResult;

  // 3. Wind-affected check
  if (ridgeWindMph >= 25 && snowfall48h > 5) {
    return {
      type: 'wind-affected',
      label: 'Wind-affected',
      emoji: '💨',
      detail: `Ridge ${ridgeWindMph} mph · recent snow wind-loaded`,
    };
  }

  // 4. Crust check
  if (hadRainOnSnow) {
    return {
      type: 'crust',
      label: 'Crust',
      emoji: '🧊',
      detail: 'Rain-on-snow event',
    };
  }
  if (tempCrossings >= 4 && snowfall48h < 5) {
    // 4+ crossings means 2+ full melt-freeze cycles
    return {
      type: 'crust',
      label: 'Crust',
      emoji: '🧊',
      detail: 'Melt-freeze crust',
    };
  }

  // 5. Packed powder — some recent snow (5-15cm) but below the powder threshold
  if (snowfall48h >= 5 && currentHour.temperature_2m < 0) {
    return {
      type: 'packed-powder',
      label: 'Packed Powder',
      emoji: '🎿',
      detail: `${snowfall48hInches}" in 48h · ${tourTempF}°F`,
    };
  }

  // 6. Variable — moderate melt-freeze cycling (2-3 crossings, not enough for crust)
  if (tempCrossings >= 2 && snowfall48h < 5) {
    return {
      type: 'variable',
      label: 'Variable',
      emoji: '🔀',
      detail: `Mixed freeze-thaw · ${tourTempF}°F`,
    };
  }

  // 7. Incoming snow
  const next24h = hourly.slice(currentIdx, currentIdx + 24);
  const incomingSnow = next24h.reduce((sum, h) => sum + h.snowfall, 0);
  const incomingSnowIn = Math.round(incomingSnow / 2.54);

  if (incomingSnowIn >= 6) {
    return {
      type: 'firm',
      label: 'Firm → Powder',
      emoji: '🏔️',
      detail: `${incomingSnowIn}" incoming in 24h`,
    };
  }

  // 8. Wind-scoured — significant wind but no recent snow to load
  if (ridgeWindMph >= 20) {
    return {
      type: 'wind-scoured',
      label: 'Wind-scoured',
      emoji: '🏔️',
      detail: `Ridge ${ridgeWindMph} mph · ${tourTempF}°F`,
    };
  }

  // 9. Spring snow / softening — warm temps, above freezing, daytime
  if (tourTempF > 32 && currentHour.is_day) {
    return {
      type: 'spring-snow',
      label: 'Spring Snow',
      emoji: '☀️',
      detail: `Soft · ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
    };
  }

  if (tourTempF > 28) {
    return {
      type: 'softening',
      label: 'Softening',
      emoji: '🌤️',
      detail: `${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
    };
  }

  // 10. Firm — cold, dry, no recent snow
  return {
    type: 'firm',
    label: 'Firm',
    emoji: '🏔️',
    detail: `Hard-packed · ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
  };
}

// ---------------------------------------------------------------------------
// Corn detection helper
// ---------------------------------------------------------------------------

function checkCorn(
  forecast: WeatherForecast,
  tour: Tour,
  variant: TourVariant,
  currentIdx: number,
  refMs: number,
): SnowClassification | null {
  const hourly = forecast.hourly;

  // Check overnight refreeze: any hour in previous 12h with temp < 0°C
  let hadOvernightRefreeze = false;
  const h12ago = refMs - 12 * 3600 * 1000;
  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break;
    if (t < h12ago) continue;
    if (!h.is_day && h.temperature_2m < 0) {
      hadOvernightRefreeze = true;
      break;
    }
  }
  if (!hadOvernightRefreeze) return null;

  // Check daytime warming: freezing level rises above tour min elevation
  const currentHour = hourly[currentIdx];
  if (currentHour.freezing_level_height < tour.min_elevation_m) return null;

  // Check solar illumination on the variant's primary aspects
  const [lng, lat] = tour.trailhead.geometry.coordinates as [number, number];
  const aspects = variant.primary_aspects;

  // Look for corn window in daylight hours today (current idx forward, up to 12h)
  let cornStart: string | null = null;
  let cornEnd: string | null = null;

  for (let i = currentIdx; i < Math.min(currentIdx + 12, hourly.length); i++) {
    const h = hourly[i];
    if (!h.is_day) continue;

    const hourTime = new Date(h.time);
    const sun = getSunPosition(hourTime, lat, lng);
    if (sun.elevation <= 15) continue; // sun too low

    // Check if sun hits any of the variant's primary aspects
    const sunHitsVariant = aspects.some((aspect) => {
      const bearing = ASPECT_BEARING[aspect];
      return bearing !== undefined && sunHitsAspect(sun.azimuth, bearing);
    });

    if (sunHitsVariant && h.freezing_level_height >= tour.min_elevation_m) {
      const hourLabel = hourTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        timeZone: 'America/Los_Angeles',
      });
      if (!cornStart) cornStart = hourLabel;
      cornEnd = hourLabel;
    }
  }

  if (cornStart && cornEnd) {
    const aspectStr = aspects.join('/');
    return {
      type: 'corn',
      label: 'Corn',
      emoji: '🌽',
      detail: `Corn window ${cornStart}–${cornEnd} on ${aspectStr}`,
    };
  }

  return null;
}
