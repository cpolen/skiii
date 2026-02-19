import { useQuery } from '@tanstack/react-query';
import type { WeatherForecast } from '@/lib/types/conditions';
import type { Tour } from '@/lib/types/tour';

/**
 * Fetch 72-hour weather forecast for a tour's trailhead location.
 * Uses Open-Meteo via our /api/weather proxy.
 */
export function useWeather(tour: Tour) {
  const [lng, lat] = tour.trailhead.geometry.coordinates as [number, number];

  return useQuery<WeatherForecast>({
    queryKey: ['weather', lat, lng],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // keep in cache 1 hour
    enabled: !!(lat && lng),
  });
}

/**
 * Get the hourly entry closest to the current time.
 */
export function getCurrentHour(forecast: WeatherForecast) {
  const now = Date.now();
  let closest = forecast.hourly[0];
  let minDiff = Infinity;

  for (const hour of forecast.hourly) {
    const diff = Math.abs(new Date(hour.time).getTime() - now);
    if (diff < minDiff) {
      minDiff = diff;
      closest = hour;
    }
  }

  return closest;
}
