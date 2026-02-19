import { useQuery } from '@tanstack/react-query';
import type { GridPrecipData } from '@/lib/types/conditions';

export interface GridBbox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  step?: number; // default 0.005 (~550m)
}

/**
 * Fetch precipitation grid data.
 * When a bbox is provided, fetches a fine-grained grid scoped to that area.
 * Without a bbox, falls back to the coarse full-map grid.
 * When hour is provided (0-71), fetches that specific forecast hour instead of current.
 */
export function useGridPrecip(bbox?: GridBbox | null, hour?: number | null, enabled = true) {
  // Build a stable query key from the bbox (rounded to avoid refetching on tiny changes)
  const keyParts = bbox
    ? [
        'route',
        bbox.latMin.toFixed(3),
        bbox.latMax.toFixed(3),
        bbox.lngMin.toFixed(3),
        bbox.lngMax.toFixed(3),
      ]
    : ['full'];
  const hourKey = hour != null ? hour : 'now';

  return useQuery<GridPrecipData>({
    queryKey: ['weather', 'grid', ...keyParts, hourKey],
    queryFn: async () => {
      let params = bbox
        ? `?latMin=${bbox.latMin}&latMax=${bbox.latMax}&lngMin=${bbox.lngMin}&lngMax=${bbox.lngMax}&step=${bbox.step ?? 0.005}`
        : '';
      if (hour != null) {
        params += `${params ? '&' : '?'}hour=${hour}`;
      }
      const res = await fetch(`/api/weather/grid${params}`);
      if (!res.ok) throw new Error(`Grid fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled,
  });
}
