import { useMemo } from 'react';
import type { Tour } from '@/lib/types/tour';
import { useWeather, getCurrentHour } from '@/hooks/useWeather';
import { celsiusToFahrenheit, kmhToMph } from '@/lib/types/conditions';
import { getGearRecommendations, type GearItem } from '@/lib/analysis/gear';

/**
 * Shared hook that computes gear recommendations from weather + tour data.
 * Used by both GearRecommendation (full-page) and GearListCompact (sidebar).
 */
export function useGearRecommendations(tour: Tour) {
  const { data: forecast, isLoading, error } = useWeather(tour);

  const items = useMemo((): GearItem[] => {
    if (!forecast) return [];
    const hour = getCurrentHour(forecast);
    const tempF = celsiusToFahrenheit(hour.temperature_2m);
    const windMph = kmhToMph(hour.wind_speed_80m);
    const hasSteepBootpack = tour.variants.some((v) => v.slope_angle_max >= 40);
    const tourHours = (tour.estimated_hours_range[0] + tour.estimated_hours_range[1]) / 2;

    return getGearRecommendations({
      tempF,
      windMph,
      precipitating: hour.precipitation > 0,
      isSnowing: hour.snowfall > 0,
      isRaining: hour.precipitation > 0 && hour.snowfall === 0,
      visibility: hour.visibility,
      hasSteepBootpack,
      tourHours,
    });
  }, [forecast, tour]);

  return { items, isLoading, error, forecast };
}
