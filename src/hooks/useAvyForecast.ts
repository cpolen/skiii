import { useQuery } from '@tanstack/react-query';
import type { AvyForecastZone, AvyDetailedForecast } from '@/app/api/avalanche/route';

export interface AvyForecastResponse {
  zones: AvyForecastZone[];
  detailed: AvyDetailedForecast | null;
  fetchedAt: string;
}

/**
 * Fetch current avalanche forecast from SAC via our proxy API.
 * Includes zone-level danger + detailed forecast (danger by elevation, problems).
 */
export function useAvyForecast() {
  return useQuery<AvyForecastResponse>({
    queryKey: ['avalanche', 'forecast'],
    queryFn: async () => {
      const res = await fetch('/api/avalanche');
      if (!res.ok) throw new Error(`Avalanche fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,
  });
}
