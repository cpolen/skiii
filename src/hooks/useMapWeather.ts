import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '@/stores/map';
import type { WeatherForecast } from '@/lib/types/conditions';

/**
 * Fetch weather for the current map center point.
 * Rounds coordinates to 2 decimal places (~1km) to avoid
 * refetching on every tiny pan movement.
 */
export function useMapWeather() {
  const center = useMapStore((s) => s.center);
  const [lng, lat] = center;

  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  return useQuery<WeatherForecast>({
    queryKey: ['weather', 'map', roundedLat, roundedLng],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${roundedLat}&lng=${roundedLng}`);
      if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!(lat && lng),
  });
}
