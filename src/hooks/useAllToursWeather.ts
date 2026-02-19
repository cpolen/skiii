import { useQueries } from '@tanstack/react-query';
import type { WeatherForecast } from '@/lib/types/conditions';
import { tours } from '@/data/tours';

/**
 * Batch-fetch weather forecasts for all tours in parallel.
 * Uses the same queryKey format as useWeather (['weather', lat, lng])
 * so data is shared: when a user later selects a tour, useWeather()
 * finds the data already cached — zero additional fetches.
 */
export function useAllToursWeather() {
  return useQueries({
    queries: tours.map((tour) => {
      const [lng, lat] = tour.trailhead.geometry.coordinates as [number, number];
      return {
        queryKey: ['weather', lat, lng],
        queryFn: async (): Promise<WeatherForecast> => {
          const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
          if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
          return res.json();
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
      };
    }),
  });
}
