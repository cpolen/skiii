import type { WeatherForecast, HourlyWeather } from '@/lib/types/conditions';
import type { Tour } from '@/lib/types/tour';
import { kmhToMph, metersToFeet } from '@/lib/types/conditions';

export type Favorability = 'more' | 'caution' | 'less';

export interface TimeWindow {
  startHour: number; // index into forecast.hourly
  endHour: number;
  favorability: Favorability;
  reasons: string[];
}

/**
 * Analyze 72-hour weather to identify favorable/unfavorable time windows
 * for a specific tour. Never uses "safe" — uses "more favorable" / "less favorable".
 */
/**
 * Categorize a reason string so we can keep only one per category
 * when merging across hours within the same window.
 */
function reasonCategory(reason: string): string {
  if (reason.startsWith('Ridge winds') || reason === 'Light winds') return 'wind';
  if (reason.includes('precipitation') || reason === 'Dry') return 'precip';
  if (reason.includes('Rain-on-snow') || reason.includes('freezing level')) return 'freezing';
  if (reason.includes('visibility') || reason.includes('Visibility')) return 'visibility';
  if (reason.includes('Nighttime')) return 'nighttime';
  return reason;
}

export function analyzeTiming(
  forecast: WeatherForecast,
  tour: Tour,
): { windows: TimeWindow[] } {
  const windows: TimeWindow[] = [];
  const tourMaxElev = metersToFeet(tour.max_elevation_m);
  const tourMinElev = metersToFeet(tour.min_elevation_m);

  let currentWindow: TimeWindow | null = null;
  // Track reasons by category so later (worse) values replace earlier ones
  let reasonsByCategory = new Map<string, string>();

  for (let i = 0; i < forecast.hourly.length; i++) {
    const hour = forecast.hourly[i];
    const { favorability, reasons } = assessHour(hour, tourMaxElev, tourMinElev);

    if (!currentWindow || currentWindow.favorability !== favorability) {
      if (currentWindow) {
        currentWindow.reasons = Array.from(reasonsByCategory.values());
        windows.push(currentWindow);
      }
      reasonsByCategory = new Map<string, string>();
      for (const r of reasons) {
        reasonsByCategory.set(reasonCategory(r), r);
      }
      currentWindow = { startHour: i, endHour: i, favorability, reasons: [...reasons] };
    } else {
      currentWindow.endHour = i;
      // Merge by category — later values overwrite earlier ones
      for (const r of reasons) {
        reasonsByCategory.set(reasonCategory(r), r);
      }
    }
  }

  if (currentWindow) {
    currentWindow.reasons = Array.from(reasonsByCategory.values());
    windows.push(currentWindow);
  }

  return { windows };
}

export function assessHour(
  hour: HourlyWeather,
  tourMaxElev: number,
  tourMinElev: number,
): { favorability: Favorability; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0; // positive = favorable, negative = unfavorable

  const windMph = kmhToMph(hour.wind_speed_10m);
  const ridgeWindMph = kmhToMph(hour.wind_speed_80m);
  const freezingLevelFt = metersToFeet(hour.freezing_level_height);

  // --- Daylight is a hard requirement for backcountry touring ---
  if (!hour.is_day) {
    return { favorability: 'less', reasons: ['Nighttime — not a touring window'] };
  }

  // Wind assessment
  if (ridgeWindMph >= 30) {
    score -= 3;
    reasons.push(`Ridge winds ${ridgeWindMph} mph — extreme`);
  } else if (ridgeWindMph >= 20) {
    score -= 2;
    reasons.push(`Ridge winds ${ridgeWindMph} mph — significant loading`);
  } else if (ridgeWindMph < 15 && windMph < 10) {
    score += 2;
    reasons.push('Light winds');
  } else {
    // Moderate wind — neutral
    reasons.push(`Ridge winds ${ridgeWindMph} mph`);
  }

  // Precipitation
  if (hour.precipitation > 2) {
    score -= 3;
    reasons.push('Heavy precipitation');
  } else if (hour.precipitation > 0) {
    score -= 2;
    reasons.push('Active precipitation');
  } else {
    score += 1;
    reasons.push('Dry');
  }

  // Freezing level vs tour elevation — rain-on-snow risk
  if (freezingLevelFt > tourMinElev && hour.precipitation > 0) {
    if (hour.precipitation <= 1) {
      score -= 1;
      reasons.push(`Light rain-on-snow risk — freezing level ${freezingLevelFt.toLocaleString()}'`);
    } else {
      score -= 3;
      reasons.push(`Rain-on-snow risk — freezing level ${freezingLevelFt.toLocaleString()}'`);
    }
  }

  // Visibility
  if (hour.visibility < 500) {
    score -= 2;
    reasons.push('Very poor visibility');
  } else if (hour.visibility < 2000) {
    score -= 1;
    reasons.push('Reduced visibility');
  }

  // Map score to favorability
  let favorability: Favorability;
  if (score >= 2) {
    favorability = 'more';
  } else if (score >= 0) {
    favorability = 'caution';
  } else {
    favorability = 'less';
  }

  return { favorability, reasons };
}
