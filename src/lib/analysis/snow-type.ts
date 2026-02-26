import type { WeatherForecast, HourlyWeather } from '@/lib/types/conditions';
import type { Tour, TourVariant } from '@/lib/types/tour';
import { kmhToMph, celsiusToFahrenheit, getLoadedAspect, windDegreesToCompass } from '@/lib/types/conditions';
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
  /** Rich narrative explaining the weather that created this condition */
  explanation: string;
  /** Quality score 0-100 (powder and corn only) */
  score?: number;
  /** Confidence in the classification */
  confidence?: 'low' | 'medium' | 'high';
  /** Corn window start time (ISO string) */
  cornWindowStart?: string;
  /** Corn window end time (ISO string) */
  cornWindowEnd?: string;
  /** Recommended trailhead departure time (ISO string) */
  startBy?: string;
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
// Shared helpers (used by both corn and powder scoring)
// ---------------------------------------------------------------------------

/** Average cloud cover (%) during nighttime hours in the 12h before refMs. */
function overnightCloudCover(hourly: HourlyWeather[], refMs: number): number {
  const h12ago = refMs - 12 * 3600 * 1000;
  let sum = 0;
  let count = 0;
  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break;
    if (t < h12ago) continue;
    if (!h.is_day) {
      sum += h.cloud_cover;
      count++;
    }
  }
  return count > 0 ? sum / count : 100; // assume cloudy if no data
}

/** Overnight freeze duration (hours below 0°C) and min temperature in past 12h. */
function overnightFreezeStats(
  hourly: HourlyWeather[],
  refMs: number,
): { freezeHours: number; minTempC: number } {
  const h12ago = refMs - 12 * 3600 * 1000;
  let freezeHours = 0;
  let minTempC = Infinity;
  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break;
    if (t < h12ago) continue;
    if (!h.is_day && h.temperature_2m < 0) {
      freezeHours++;
      minTempC = Math.min(minTempC, h.temperature_2m);
    }
  }
  return { freezeHours, minTempC: minTempC === Infinity ? 0 : minTempC };
}

/** Dewpoint depression at the reference hour (temp minus dewpoint in °C). */
function dewpointDepression(hour: HourlyWeather): number {
  return hour.temperature_2m - hour.dewpoint_2m;
}

/** Days since last significant snowfall (> 2cm in a single hour). Scans backward from refMs. */
function daysSinceSnowfall(hourly: HourlyWeather[], refMs: number): number {
  for (let i = hourly.length - 1; i >= 0; i--) {
    const t = new Date(hourly[i].time).getTime();
    if (t > refMs) continue;
    if (hourly[i].snowfall > 2) {
      return Math.max(0, (refMs - t) / (24 * 3600 * 1000));
    }
  }
  return 7; // no snowfall found in data range — assume > 7 days
}

/**
 * Count consecutive days (up to refMs) where temperature crossed 0°C in
 * both directions (freeze at night + thaw during day). This indicates an
 * established melt-freeze cycle.
 */
function countMeltFreezeDays(hourly: HourlyWeather[], refMs: number): number {
  // Group hours by calendar date
  const dayMap = new Map<string, { hadFreeze: boolean; hadThaw: boolean }>();
  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break;
    const dateKey = h.time.slice(0, 10); // YYYY-MM-DD
    let entry = dayMap.get(dateKey);
    if (!entry) {
      entry = { hadFreeze: false, hadThaw: false };
      dayMap.set(dateKey, entry);
    }
    if (h.temperature_2m < 0) entry.hadFreeze = true;
    if (h.temperature_2m > 0 && h.is_day) entry.hadThaw = true;
  }

  // Count consecutive melt-freeze days working backward from most recent
  const dates = [...dayMap.keys()].sort().reverse();
  let count = 0;
  for (const date of dates) {
    const entry = dayMap.get(date)!;
    if (entry.hadFreeze && entry.hadThaw) {
      count++;
    } else {
      break; // streak broken
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Powder quality scoring
// ---------------------------------------------------------------------------

/**
 * Score powder quality on a 0-100 scale.
 * Factors: snowfall amount (30), recency (20), temperature/density (20),
 * wind speed (15), wind direction vs aspect (15).
 */
function scorePowderQuality(
  snowfall48h: number,
  snowfall12h: number,
  tourTempF: number,
  ridgeWindMph: number,
  windDir80m: number,
  aspects: string[],
): { score: number; qualityNote: string } {
  let score = 0;
  const notes: string[] = [];

  // 1. Snowfall amount (30 pts) — 10cm=0, 15cm=10, 25cm=20, 40cm+=30
  if (snowfall48h >= 40) {
    score += 30;
  } else if (snowfall48h >= 15) {
    score += Math.round(10 + ((snowfall48h - 15) / 25) * 20);
  } else if (snowfall48h >= 10) {
    score += Math.round(((snowfall48h - 10) / 5) * 10);
  }

  // 2. Recency (20 pts) — ratio of last-12h snowfall to 48h total
  if (snowfall48h > 0) {
    const recencyRatio = snowfall12h / snowfall48h;
    score += Math.round(recencyRatio * 20);
    if (recencyRatio > 0.6) notes.push('fresh');
    else if (recencyRatio < 0.2) notes.push('settling');
  }

  // 3. Temperature / density proxy (20 pts)
  if (tourTempF < 15) {
    score += 20;
    notes.push('cold & dry');
  } else if (tourTempF < 25) {
    score += 15;
  } else if (tourTempF < 32) {
    score += 10;
  }
  // > 32°F = 0 pts (wet snow)

  // 4. Wind speed (15 pts)
  if (ridgeWindMph < 10) {
    score += 15;
    notes.push('calm');
  } else if (ridgeWindMph < 20) {
    score += 10;
  } else if (ridgeWindMph < 25) {
    score += 5;
  }

  // 5. Wind direction vs aspect (15 pts)
  const loadedAspect = getLoadedAspect(windDir80m);
  const isLoading = aspects.includes(loadedAspect);
  // Check if wind is scouring (wind FROM the aspect direction)
  const windFromAspect = getLoadedAspect((windDir80m + 180) % 360);
  const isScouring = aspects.includes(windFromAspect);

  if (isLoading) {
    score += 15;
    if (ridgeWindMph >= 10) notes.push(`wind-loaded on ${loadedAspect}`);
  } else if (isScouring) {
    score += 0;
  } else {
    score += 8; // neutral
  }

  const qualityNote = notes.length > 0 ? notes.join(' · ') : '';
  return { score: Math.min(100, score), qualityNote };
}

// ---------------------------------------------------------------------------
// Corn quality scoring
// ---------------------------------------------------------------------------

/**
 * Score corn quality on a 0-100 scale.
 * Factors: overnight cloud cover (25), freeze duration/strength (20),
 * dewpoint depression (10), wind (10), days since snowfall (10),
 * shortwave radiation (10), consecutive melt-freeze days (10), snow depth (5).
 */
function scoreCornQuality(
  avgCloudCover: number,
  freezeStats: { freezeHours: number; minTempC: number },
  dpDepression: number,
  ridgeWindMph: number,
  daysSinceSnow: number,
  avgShortwave: number,
  meltFreezeDays: number,
  snowDepthM: number,
): number {
  let score = 0;

  // 1. Overnight cloud cover (25 pts) — clear = radiative cooling
  // 0% cloud = 25pts, 100% cloud = 0pts
  score += Math.round(25 * (1 - avgCloudCover / 100));

  // 2. Freeze duration + strength (20 pts)
  // >= 6 hours below freezing = full duration points (10)
  const durationPts = Math.min(10, Math.round((freezeStats.freezeHours / 6) * 10));
  // Min temp < -8°C = full strength points (10), > 0 = 0
  const strengthPts = Math.min(10, Math.round(Math.max(0, -freezeStats.minTempC) / 8 * 10));
  score += durationPts + strengthPts;

  // 3. Dewpoint depression (10 pts) — dry air = better refreeze
  // > 10°C depression = 10pts, 0 = 0
  score += Math.min(10, Math.round(Math.max(0, dpDepression) / 10 * 10));

  // 4. Wind speed (10 pts) — calm = even softening
  if (ridgeWindMph < 10) score += 10;
  else if (ridgeWindMph < 20) score += 6;
  else if (ridgeWindMph < 30) score += 3;

  // 5. Days since last snowfall (10 pts) — > 3 days = established surface
  if (daysSinceSnow >= 3) score += 10;
  else if (daysSinceSnow >= 2) score += 7;
  else if (daysSinceSnow >= 1) score += 3;
  // < 1 day = fresh snow disrupts corn cycle = 0

  // 6. Shortwave radiation (10 pts) — drives the melt phase
  // > 600 W/m² = 10pts, 0 = 0
  score += Math.min(10, Math.round(Math.max(0, avgShortwave) / 600 * 10));

  // 7. Consecutive melt-freeze days (10 pts)
  if (meltFreezeDays >= 3) score += 10;
  else if (meltFreezeDays >= 2) score += 7;
  else if (meltFreezeDays >= 1) score += 3;

  // 8. Snow depth (5 pts) — shallow pack = bad corn
  // > 1m = 5pts, 0.5m = 3pts, < 0.3m = 0
  if (snowDepthM >= 1) score += 5;
  else if (snowDepthM >= 0.5) score += 3;
  else if (snowDepthM >= 0.3) score += 1;

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Classification algorithm
// ---------------------------------------------------------------------------

/**
 * Classify the dominant snow type for a tour/variant based on the forecast.
 * With past_days=3, the hourly array covers ~6 days (3 past + 3 forecast).
 * Checks run in priority order — first match wins.
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
    return { type: 'firm', label: 'Firm', emoji: '🏔️', detail: 'No forecast data', explanation: 'No forecast data available.' };
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
  const h12ago = refMs - 12 * 3600 * 1000;
  let snowfall48h = 0;
  let snowfall12h = 0;
  let hadRainOnSnow = false;
  let tempCrossings = 0;
  let prevAboveFreezing: boolean | null = null;

  for (const h of hourly) {
    const t = new Date(h.time).getTime();
    if (t > refMs) break; // only look at hours up to reference time
    if (t < h48ago) continue;

    snowfall48h += h.snowfall; // cm/hr accumulated
    if (t >= h12ago) snowfall12h += h.snowfall;

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

  // 1. Powder check (with quality scoring)
  if (
    snowfall48h > 10 && // >10cm (~4") in 48h (lowered from 15 to catch quality light powder)
    tourTempF < 32 && // elevation-adjusted below freezing
    ridgeWindMph < 25 // not wind-packed
  ) {
    const aspects = variant.primary_aspects;
    const { score, qualityNote } = scorePowderQuality(
      snowfall48h,
      snowfall12h,
      tourTempF,
      ridgeWindMph,
      currentHour.wind_direction_80m,
      aspects,
    );

    // Score < 25 falls through to packed-powder or other types
    if (score >= 25) {
      const label = score >= 75 ? 'Deep Powder' : score >= 50 ? 'Powder' : 'Light Powder';
      const confidence: 'low' | 'medium' | 'high' =
        score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
      const detailParts = [`${snowfall48hInches}"`];
      if (qualityNote) detailParts.push(qualityNote);
      else detailParts.push(`${tourTempF}°F`);

      const snowfall12hInches = Math.round(snowfall12h / 2.54);
      const windDir = windDegreesToCompass(currentHour.wind_direction_80m);
      const loadedAspect = getLoadedAspect(currentHour.wind_direction_80m);
      const isLoading = (aspects as string[]).includes(loadedAspect);
      const explParts = [
        `${snowfall48hInches}" of snow in the last 48 hours (${snowfall12hInches}" in the last 12h).`,
        `Temperature at ${Math.round(tourMidElevFt).toLocaleString()}' is ${tourTempF}°F${tourTempF < 20 ? ', keeping the snow cold and dry' : tourTempF < 28 ? ', preserving snow quality' : ', near freezing'}.`,
        `Ridge winds ${ridgeWindMph} mph from the ${windDir}.`,
      ];
      if (isLoading && ridgeWindMph >= 10) {
        explParts.push(`Wind is loading snow onto ${loadedAspect}-facing slopes.`);
      }

      return {
        type: 'powder',
        label,
        emoji: '❄️',
        detail: detailParts.join(' · '),
        explanation: explParts.join(' '),
        score,
        confidence,
      };
    }
  }

  // 2. Corn check (aspect-specific spring cycle with quality scoring)
  const cornResult = checkCorn(forecast, tour, variant, currentIdx, refMs);
  if (cornResult) return cornResult;

  // 3. Wind-affected check
  if (ridgeWindMph >= 25 && snowfall48h > 5) {
    const windDir = windDegreesToCompass(currentHour.wind_direction_80m);
    const loadedAspect = getLoadedAspect(currentHour.wind_direction_80m);
    const scouringAspect = getLoadedAspect((currentHour.wind_direction_80m + 180) % 360);
    return {
      type: 'wind-affected',
      label: 'Wind-affected',
      emoji: '💨',
      detail: `Ridge ${ridgeWindMph} mph · recent snow wind-loaded`,
      explanation: `Ridge winds are blowing ${ridgeWindMph} mph from the ${windDir}, redistributing ${snowfall48hInches}" of recent snow. Expect wind slab on ${loadedAspect}-facing slopes and scoured conditions on ${scouringAspect}-facing terrain. Temperature is ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`,
    };
  }

  // 4. Crust check
  if (hadRainOnSnow) {
    // Compute rain details for explanation
    let totalRainMm = 0;
    let rainHours = 0;
    let peakFreezingM = 0;
    let minTempAfterRainC = Infinity;
    let rainEnded = false;
    for (const h of hourly) {
      const t = new Date(h.time).getTime();
      if (t > refMs) break;
      if (t < h48ago) continue;
      if (h.precipitation > 0 && h.freezing_level_height > tour.max_elevation_m) {
        totalRainMm += h.precipitation;
        rainHours++;
        peakFreezingM = Math.max(peakFreezingM, h.freezing_level_height);
        rainEnded = false;
      } else if (totalRainMm > 0) {
        rainEnded = true;
      }
      if (rainEnded) {
        minTempAfterRainC = Math.min(minTempAfterRainC, h.temperature_2m);
      }
    }
    const totalRainIn = Math.round(totalRainMm / 25.4 * 10) / 10;
    const peakFreezingFt = Math.round(peakFreezingM * 3.28084).toLocaleString();
    const minTempAfterF = minTempAfterRainC < Infinity ? Math.round(celsiusToFahrenheit(minTempAfterRainC)) : null;
    const explParts = [
      `${totalRainIn}" of rain fell over ${rainHours} hour${rainHours !== 1 ? 's' : ''} while the freezing level was above ${peakFreezingFt}', saturating the snowpack.`,
    ];
    if (minTempAfterF !== null && minTempAfterF < 32) {
      explParts.push(`Temperatures then dropped to ${minTempAfterF}°F, forming a hard ice crust on the surface.`);
    } else {
      explParts.push(`Current temperature is ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`);
    }
    return {
      type: 'crust',
      label: 'Crust',
      emoji: '🧊',
      detail: 'Rain-on-snow event',
      explanation: explParts.join(' '),
    };
  }
  if (tempCrossings >= 4 && snowfall48h < 5) {
    // 4+ crossings means 2+ full melt-freeze cycles
    const cycles = Math.floor(tempCrossings / 2);
    return {
      type: 'crust',
      label: 'Crust',
      emoji: '🧊',
      detail: 'Melt-freeze crust',
      explanation: `${tempCrossings} temperature swings across freezing in the last 48 hours (${cycles} full melt-freeze cycles) with no significant new snow have created a hard crust. Current temperature is ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`,
    };
  }

  // 5. Packed powder — some recent snow (5-10cm) but below the powder threshold
  if (snowfall48h >= 5 && tourTempF < 32) {
    return {
      type: 'packed-powder',
      label: 'Packed Powder',
      emoji: '🎿',
      detail: `${snowfall48hInches}" in 48h · ${tourTempF}°F`,
      explanation: `${snowfall48hInches}" of snow fell in the last 48 hours but has settled below the powder threshold. Temperature is ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}' — firm but carveable. Ridge winds are ${ridgeWindMph} mph.`,
    };
  }

  // 6. Variable — moderate melt-freeze cycling (2-3 crossings, not enough for crust)
  if (tempCrossings >= 2 && snowfall48h < 5) {
    return {
      type: 'variable',
      label: 'Variable',
      emoji: '🔀',
      detail: `Mixed freeze-thaw · ${tourTempF}°F`,
      explanation: `${tempCrossings} freeze-thaw cycles in the last 48 hours with minimal new snow. Surface quality varies by aspect and elevation — sun-exposed slopes will be softer while shaded terrain stays firm. Currently ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`,
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
      explanation: `Currently firm with no significant recent snow, but ${incomingSnowIn}" of snowfall is forecast in the next 24 hours. Temperature is ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`,
    };
  }

  // 8. Wind-scoured — significant wind but no recent snow to load
  if (ridgeWindMph >= 20) {
    const windDir = windDegreesToCompass(currentHour.wind_direction_80m);
    return {
      type: 'wind-scoured',
      label: 'Wind-scoured',
      emoji: '🏔️',
      detail: `Ridge ${ridgeWindMph} mph · ${tourTempF}°F`,
      explanation: `Sustained ${ridgeWindMph} mph ridge winds from the ${windDir} with no significant recent snowfall have stripped soft snow from exposed terrain. Hard, icy surfaces likely on windward aspects. Currently ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'.`,
    };
  }

  // 9. Spring snow / softening — warm temps, above freezing, daytime
  if (tourTempF > 32 && currentHour.is_day) {
    const snowDepthIn = Math.round(currentHour.snow_depth * 39.37);
    const depthNote = snowDepthIn > 0 ? ` Snow depth is approximately ${snowDepthIn}".` : '';
    return {
      type: 'spring-snow',
      label: 'Spring Snow',
      emoji: '☀️',
      detail: `Soft · ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
      explanation: `Above freezing at ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'. The surface is soft and wet from solar warming.${depthNote} Best to ski early before the snow becomes heavy and sticky. Ridge winds are ${ridgeWindMph} mph.`,
    };
  }

  if (tourTempF > 28) {
    return {
      type: 'softening',
      label: 'Softening',
      emoji: '🌤️',
      detail: `${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
      explanation: `Temperatures approaching freezing at ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'. The surface is losing its firmness but hasn't entered a full corn cycle — overnight refreeze may have been insufficient or the melt-freeze pattern isn't established yet. Ridge winds are ${ridgeWindMph} mph.`,
    };
  }

  // 10. Firm — cold, dry, no recent snow
  return {
    type: 'firm',
    label: 'Firm',
    emoji: '🏔️',
    detail: `Hard-packed · ${tourTempF}°F at ${Math.round(tourMidElevFt).toLocaleString()}'`,
    explanation: `No significant recent snowfall and cold at ${tourTempF}°F. Hard-packed surface at ${Math.round(tourMidElevFt).toLocaleString()}'. Ridge winds are ${ridgeWindMph} mph.`,
  };
}

// ---------------------------------------------------------------------------
// Corn detection helper (with quality scoring)
// ---------------------------------------------------------------------------

function checkCorn(
  forecast: WeatherForecast,
  tour: Tour,
  variant: TourVariant,
  currentIdx: number,
  refMs: number,
): SnowClassification | null {
  const hourly = forecast.hourly;

  // Gate 1: Overnight refreeze — require >= 2 hours below freezing (stricter)
  const freezeStats = overnightFreezeStats(hourly, refMs);
  if (freezeStats.freezeHours < 2) return null;

  // Gate 2: Daytime warming — freezing level rises above tour min elevation
  const currentHour = hourly[currentIdx];
  if (currentHour.freezing_level_height < tour.min_elevation_m) return null;

  // Check solar illumination on the variant's primary aspects
  const [lng, lat] = tour.trailhead.geometry.coordinates as [number, number];
  const aspects = variant.primary_aspects;

  // Look for corn window in daylight hours (current idx forward, up to 12h)
  let cornStartTime: Date | null = null;
  let cornEndTime: Date | null = null;
  let cornStartLabel: string | null = null;
  let cornEndLabel: string | null = null;
  let totalShortwave = 0;
  let shortwaveCount = 0;

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
      if (!cornStartTime) {
        cornStartTime = hourTime;
        cornStartLabel = hourLabel;
      }
      cornEndTime = hourTime;
      // End label = next hour (end of this hour's window)
      const endHour = new Date(hourTime.getTime() + 3600 * 1000);
      cornEndLabel = endHour.toLocaleTimeString('en-US', {
        hour: 'numeric',
        timeZone: 'America/Los_Angeles',
      });
      totalShortwave += h.direct_normal_irradiance;
      shortwaveCount++;
    }
  }

  if (!cornStartTime || !cornEndTime || !cornStartLabel || !cornEndLabel) return null;

  // Compute corn quality score
  const avgCloud = overnightCloudCover(hourly, refMs);
  const dpDep = dewpointDepression(currentHour);
  const daysSinceSnow = daysSinceSnowfall(hourly, refMs);
  const avgShortwave = shortwaveCount > 0 ? totalShortwave / shortwaveCount : 0;
  const meltFreezeDays = countMeltFreezeDays(hourly, refMs);
  const snowDepthM = currentHour.snow_depth;
  const ridgeWindMph = kmhToMph(currentHour.wind_speed_80m);

  const score = scoreCornQuality(
    avgCloud,
    freezeStats,
    dpDep,
    ridgeWindMph,
    daysSinceSnow,
    avgShortwave,
    meltFreezeDays,
    snowDepthM,
  );

  // Score < 25 = not reliable corn
  if (score < 25) return null;

  // Compute "leave by" time: corn window start minus ascent time minus transition buffer
  // Ascent rate: 350 m/hr (Munter method for skinning), 30 min buffer for trailhead prep
  const ascentHours = tour.elevation_gain_m / 350;
  const bufferMs = 30 * 60 * 1000;
  const startByTime = new Date(cornStartTime.getTime() - ascentHours * 3600 * 1000 - bufferMs);
  const startByLabel = startByTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  const label = score >= 75 ? 'Prime Corn' : score >= 50 ? 'Good Corn' : 'Fair Corn';
  const confidence: 'low' | 'medium' | 'high' =
    score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
  const aspectStr = aspects.join('/');

  const detailParts = [`${cornStartLabel}–${cornEndLabel} on ${aspectStr}`];
  detailParts.push(`Leave by ${startByLabel}`);

  const minTempF = Math.round(celsiusToFahrenheit(freezeStats.minTempC));
  const cloudDesc = avgCloud < 20 ? 'clear' : avgCloud < 50 ? 'mostly clear' : avgCloud < 80 ? 'partly cloudy' : 'cloudy';
  const snowDepthIn = Math.round(snowDepthM * 39.37);
  const explParts = [
    `Overnight temperatures dropped to ${minTempF}°F with ${freezeStats.freezeHours} hours below freezing under ${cloudDesc} skies.`,
  ];
  if (meltFreezeDays >= 2) {
    explParts.push(`${meltFreezeDays} consecutive days of melt-freeze cycling have established a corn surface.`);
  } else {
    explParts.push(`Melt-freeze cycle is developing.`);
  }
  explParts.push(`Solar radiation will soften ${aspectStr}-facing aspects between ${cornStartLabel}–${cornEndLabel}.`);
  if (snowDepthIn > 0) {
    explParts.push(`Snow depth is approximately ${snowDepthIn}".`);
  }
  explParts.push(`Ridge winds are ${ridgeWindMph} mph.`);

  return {
    type: 'corn',
    label,
    emoji: '🌽',
    detail: detailParts.join(' · '),
    explanation: explParts.join(' '),
    score,
    confidence,
    cornWindowStart: cornStartTime.toISOString(),
    cornWindowEnd: new Date(cornEndTime.getTime() + 3600 * 1000).toISOString(),
    startBy: startByTime.toISOString(),
  };
}
