import type { WeatherForecast } from '@/lib/types/conditions';
import type { Tour, TourVariant } from '@/lib/types/tour';
import type { AvyDetailedForecast, AvyDangerByDay, AvyProblem, AvyForecastZone } from '@/app/api/avalanche/route';
import { assessHour } from './timing';
import { metersToFeet, kmhToMph } from '@/lib/types/conditions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConditionsBand = 'more' | 'moderate' | 'elevated' | 'significant' | 'serious';

export interface ConditionsAssessment {
  composite: number; // 0-100
  band: ConditionsBand;
  bandLabel: string;
  bandColor: string; // hex
  avalanche: number | null; // null when avy data unavailable
  weather: number;
  terrain: number;
  reasons: string[]; // top 3-4 driving factors
}

// ---------------------------------------------------------------------------
// Reason deduplication
// ---------------------------------------------------------------------------

/** Categorize a reason string so we keep only one per category. */
function reasonCategory(reason: string): string {
  if (reason.startsWith('Ridge winds') || reason === 'Light winds') return 'wind';
  if (reason.includes('precipitation') || reason === 'Dry') return 'precip';
  if (reason.includes('Rain-on-snow') || reason.includes('freezing level')) return 'freezing';
  if (reason.includes('visibility') || reason.includes('Visibility')) return 'visibility';
  if (reason.includes('Nighttime')) return 'nighttime';
  return reason;
}

// ---------------------------------------------------------------------------
// Display band mapping
// ---------------------------------------------------------------------------

const BANDS: { min: number; band: ConditionsBand; label: string; color: string }[] = [
  { min: 80, band: 'more', label: 'More favorable', color: '#16A34A' },
  { min: 60, band: 'moderate', label: 'Moderate concern', color: '#EAB308' },
  { min: 40, band: 'elevated', label: 'Elevated concern', color: '#F7941E' },
  { min: 20, band: 'significant', label: 'Significant concern', color: '#EF4444' },
  { min: 0, band: 'serious', label: 'Serious concern', color: '#991B1B' },
];

function getBand(score: number): { band: ConditionsBand; label: string; color: string } {
  for (const b of BANDS) {
    if (score >= b.min) return { band: b.band, label: b.label, color: b.color };
  }
  return BANDS[BANDS.length - 1];
}

// ---------------------------------------------------------------------------
// Avalanche scoring (0-100)
// ---------------------------------------------------------------------------

/** Map from location string direction word to abbreviation */
const DIR_MAP: Record<string, string> = {
  north: 'N', northeast: 'NE', east: 'E', southeast: 'SE',
  south: 'S', southwest: 'SW', west: 'W', northwest: 'NW',
};

/** Map from location string elevation word to band key */
const ELEV_MAP: Record<string, string> = {
  upper: 'upper', middle: 'middle', lower: 'lower',
};

/**
 * Resolve which avalanche forecast day applies for a given selected time.
 * Duplicates the logic from AvyDangerBanner to keep scoring.ts dependency-free.
 * For times beyond the 2-day avy window, falls back to 'tomorrow' (closest data).
 */
export function resolveAvyDay(
  selectedTime: string | null,
  detailed: AvyDetailedForecast | null,
): 'current' | 'tomorrow' {
  if (!selectedTime || !detailed) return 'current';

  const sel = new Date(selectedTime);
  const pub = detailed.published_time ? new Date(detailed.published_time) : null;
  if (!pub) return 'current';

  const pstOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  };
  const pubDate = new Intl.DateTimeFormat('en-US', pstOptions).format(pub);
  const selDate = new Intl.DateTimeFormat('en-US', pstOptions).format(sel);

  if (selDate === pubDate) return 'current';

  // Tomorrow or beyond — use tomorrow's data (closest available)
  return 'tomorrow';
}

/** Get max danger for a day across elevation bands the tour actually traverses. */
function getMaxDangerForTour(day: AvyDangerByDay, tour: Tour): number {
  const maxElev = tour.max_elevation_m;
  const levels: number[] = [];
  // Alpine ≈ above ~2750m (9,000ft) — "upper"
  if (maxElev >= 2750) levels.push(day.upper);
  // Treeline ≈ above ~2450m (8,000ft) — "middle"
  if (maxElev >= 2450) levels.push(day.middle);
  // Below treeline — always relevant
  levels.push(day.lower);
  return Math.max(...levels);
}

/** Check if a problem's locations overlap with the tour variant's aspects + elevation bands. */
function problemOverlapsTour(
  problem: AvyProblem,
  variant: TourVariant,
  tour: Tour,
): boolean {
  const tourAspects = new Set(variant.primary_aspects);
  const maxElev = tour.max_elevation_m;

  // Determine which elevation bands the tour crosses
  const tourBands = new Set<string>();
  tourBands.add('lower'); // always
  if (maxElev >= 2450) tourBands.add('middle');
  if (maxElev >= 2750) tourBands.add('upper');

  for (const loc of problem.location) {
    const parts = loc.split(' ');
    const dir = DIR_MAP[parts[0]];
    const band = ELEV_MAP[parts[1]];
    if (dir && band && tourAspects.has(dir as typeof variant.primary_aspects[number]) && tourBands.has(band)) {
      return true;
    }
  }
  return false;
}

export function scoreAvalanche(
  detailed: AvyDetailedForecast | null,
  zone: AvyForecastZone | null,
  tour: Tour,
  variant: TourVariant,
  avyDay: 'current' | 'tomorrow',
): number | null {
  // Get danger level — prefer detailed (per-elevation), fallback to zone level
  let dangerLevel: number;
  const dayData = detailed?.danger.find((d) => d.valid_day === avyDay);
  if (dayData) {
    dangerLevel = getMaxDangerForTour(dayData, tour);
  } else if (zone && !zone.off_season) {
    dangerLevel = zone.danger_level;
  } else {
    return null; // no avy data at all
  }

  // Base score from danger level
  const baseScores: Record<number, number> = { 1: 90, 2: 70, 3: 40, 4: 15, 5: 0 };
  let score = baseScores[dangerLevel] ?? 40;

  // Per-problem aspect overlap penalty
  const problems = detailed?.problems ?? [];
  for (const problem of problems) {
    if (!problemOverlapsTour(problem, variant, tour)) continue;

    // Penalty by likelihood
    const likelihoodPenalty: Record<string, number> = {
      unlikely: 3, possible: 8, likely: 13, 'very likely': 18, certain: 25,
    };
    let penalty = likelihoodPenalty[problem.likelihood] ?? 8;

    // Amplify for large problems (D3+)
    const sizeStr = String(problem.size[1] ?? '1');
    const maxSize = parseFloat(sizeStr.replace(/[^0-9.]/g, '')) || 1;
    if (maxSize >= 3) penalty = Math.round(penalty * 1.5);

    score -= penalty;
  }

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Weather scoring (0-100)
// ---------------------------------------------------------------------------

/** Map assessHour() integer score to 0-100 range. */
function hourScoreTo100(score: number): number {
  if (score >= 3) return 100;
  if (score === 2) return 85;
  if (score === 1) return 70;
  if (score === 0) return 55;
  if (score === -1) return 40;
  if (score === -2) return 25;
  if (score === -3) return 15;
  return 0; // ≤ -4
}

/**
 * Compute a raw integer score for an hour (same logic as assessHour but returns the number).
 * This avoids modifying the existing assessHour() function.
 */
function rawHourScore(
  hour: WeatherForecast['hourly'][number],
  tourMaxFt: number,
  tourMinFt: number,
): number {
  const ridgeWindMph = kmhToMph(hour.wind_speed_80m);
  const windMph = kmhToMph(hour.wind_speed_10m);
  const freezingLevelFt = metersToFeet(hour.freezing_level_height);

  if (!hour.is_day) return -5; // nighttime

  let score = 0;

  // Wind
  if (ridgeWindMph >= 30) score -= 3;
  else if (ridgeWindMph >= 20) score -= 2;
  else if (ridgeWindMph < 15 && windMph < 10) score += 2;

  // Precip
  if (hour.precipitation > 2) score -= 3;
  else if (hour.precipitation > 0) score -= 2;
  else score += 1;

  // Rain-on-snow
  if (freezingLevelFt > tourMinFt && hour.precipitation > 0) score -= 3;

  // Visibility
  if (hour.visibility < 500) score -= 2;
  else if (hour.visibility < 2000) score -= 1;

  return score;
}

export function scoreWeather(
  forecast: WeatherForecast | null,
  tour: Tour,
  selectedHour: number | null,
): { score: number; reasons: string[] } {
  if (!forecast || forecast.hourly.length === 0) {
    return { score: 55, reasons: ['Weather data unavailable'] };
  }

  const tourMaxFt = metersToFeet(tour.max_elevation_m);
  const tourMinFt = metersToFeet(tour.min_elevation_m);
  const tourDuration = Math.round(
    (tour.estimated_hours_range[0] + tour.estimated_hours_range[1]) / 2,
  );

  if (selectedHour != null) {
    // Average across the tour duration window
    const end = Math.min(selectedHour + tourDuration - 1, forecast.hourly.length - 1);
    let totalScore = 0;
    let count = 0;
    const allReasons: string[] = [];
    for (let i = selectedHour; i <= end; i++) {
      const h = forecast.hourly[i];
      if (!h) continue;
      const result = assessHour(h, tourMaxFt, tourMinFt);
      totalScore += rawHourScore(h, tourMaxFt, tourMinFt);
      count++;
      allReasons.push(...result.reasons);
    }
    const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
    return { score: hourScoreTo100(avgScore), reasons: allReasons };
  }

  // No selection — use hour closest to now
  const now = new Date();
  let closestIdx = 0;
  let closestDiff = Infinity;
  for (let i = 0; i < forecast.hourly.length; i++) {
    const diff = Math.abs(new Date(forecast.hourly[i].time).getTime() - now.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  const h = forecast.hourly[closestIdx];
  const result = assessHour(h, tourMaxFt, tourMinFt);
  const raw = rawHourScore(h, tourMaxFt, tourMinFt);
  return { score: hourScoreTo100(raw), reasons: result.reasons };
}

// ---------------------------------------------------------------------------
// Terrain scoring (0-100) — static per tour/variant
// ---------------------------------------------------------------------------

export function scoreTerrain(tour: Tour, variant: TourVariant): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];

  // ATES rating
  if (tour.ates_rating === 'complex') {
    score -= 30;
    reasons.push('Complex terrain (ATES)');
  } else if (tour.ates_rating === 'challenging') {
    score -= 15;
    reasons.push('Challenging terrain (ATES)');
  }

  // Slope angle
  if (variant.slope_angle_max > 35) {
    score -= 15;
    reasons.push(`Steep slopes (${variant.slope_angle_max}\u00B0 max)`);
  } else if (variant.slope_angle_max > 30) {
    score -= 5;
    reasons.push(`Moderate slopes (${variant.slope_angle_max}\u00B0 max)`);
  }

  // Terrain traps (max -15)
  const trapPenalty = Math.min(tour.terrain_traps.length * 5, 15);
  if (trapPenalty > 0) {
    score -= trapPenalty;
    reasons.push(`${tour.terrain_traps.length} terrain trap${tour.terrain_traps.length > 1 ? 's' : ''}`);
  }

  // Overhead hazards (max -16)
  const hazardPenalty = Math.min(tour.overhead_hazards.length * 8, 16);
  if (hazardPenalty > 0) {
    score -= hazardPenalty;
    reasons.push(`${tour.overhead_hazards.length} overhead hazard${tour.overhead_hazards.length > 1 ? 's' : ''}`);
  }

  return { score: Math.max(0, score), reasons };
}

// ---------------------------------------------------------------------------
// Composite assessment
// ---------------------------------------------------------------------------

/**
 * Compute the composite conditions assessment for a tour + variant at a given time.
 * Combines avalanche (50%), weather (35%), and terrain (15%).
 * When avalanche data is unavailable, redistributes to weather 70% / terrain 30%.
 */
export function assessConditions(
  forecast: WeatherForecast | null,
  avyData: { detailed: AvyDetailedForecast | null; zone: AvyForecastZone | null },
  tour: Tour,
  variant: TourVariant,
  selectedHour: number | null,
): ConditionsAssessment {
  // Determine avy day from the selected forecast time
  const selectedTime = selectedHour != null && forecast?.hourly[selectedHour]
    ? forecast.hourly[selectedHour].time
    : null;
  const avyDay = resolveAvyDay(selectedTime, avyData.detailed);

  const avyScore = scoreAvalanche(avyData.detailed, avyData.zone, tour, variant, avyDay);
  const { score: weatherScore, reasons: weatherReasons } = scoreWeather(forecast, tour, selectedHour);
  const { score: terrainScore, reasons: terrainReasons } = scoreTerrain(tour, variant);

  // Build reasons list (collect from all dimensions, prioritize worse factors)
  const allReasons: string[] = [];

  // Avalanche reasons
  if (avyScore != null) {
    const dayData = avyData.detailed?.danger.find((d) => d.valid_day === avyDay);
    if (dayData) {
      const maxDanger = getMaxDangerForTour(dayData, tour);
      const dangerLabels: Record<number, string> = {
        1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme',
      };
      if (maxDanger >= 3) {
        allReasons.push(`${dangerLabels[maxDanger]} avalanche danger (${maxDanger})`);
      }
    }
    // Check for overlapping problems
    const problems = avyData.detailed?.problems ?? [];
    for (const p of problems) {
      if (problemOverlapsTour(p, variant, tour)) {
        allReasons.push(`${p.name} on your aspects`);
      }
    }
  }

  // Weather reasons — deduplicate by category, keeping worst per category
  const weatherByCategory = new Map<string, string>();
  for (const r of weatherReasons) {
    if (r === 'Dry' || r === 'Light winds') continue; // skip positive reasons
    if (r.includes('Nighttime')) continue;
    const cat = reasonCategory(r);
    // Later (worse) entries overwrite earlier ones within the same category
    weatherByCategory.set(cat, r);
  }
  allReasons.push(...weatherByCategory.values());

  // Terrain reasons
  allReasons.push(...terrainReasons);

  // Compute composite
  let composite: number;
  if (avyScore != null) {
    composite = Math.round(avyScore * 0.50 + weatherScore * 0.35 + terrainScore * 0.15);
  } else {
    // No avy data — redistribute weights
    composite = Math.round(weatherScore * 0.70 + terrainScore * 0.30);
  }

  const { band, label, color } = getBand(composite);

  return {
    composite,
    band,
    bandLabel: label,
    bandColor: color,
    avalanche: avyScore,
    weather: weatherScore,
    terrain: terrainScore,
    reasons: allReasons.slice(0, 4),
  };
}
