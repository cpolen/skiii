'use client';

import { useMemo } from 'react';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import { useAllToursWeather } from '@/hooks/useAllToursWeather';
import { useWeather } from '@/hooks/useWeather';
import { useMapWeather } from '@/hooks/useMapWeather';
import { OverviewTimeline } from '@/components/tour/OverviewTimeline';
import { assessHour } from '@/lib/analysis/timing';
import type { Favorability } from '@/lib/analysis/timing';
import type { WeatherForecast } from '@/lib/types/conditions';
import { metersToFeet } from '@/lib/types/conditions';

/**
 * Always-visible floating timeline overlay positioned at the bottom of the map.
 * Shows aggregated favorability when no tour is selected,
 * or per-tour favorability when a tour is selected.
 */
export function FloatingTimeline() {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);

  const selectedTour = selectedTourSlug
    ? tours.find((t) => t.slug === selectedTourSlug) ?? null
    : null;

  // Weather for the map center point (dynamic to location dot)
  const { data: mapWeather } = useMapWeather();

  // Batch weather for aggregated view
  const weatherQueries = useAllToursWeather();

  // Per-tour weather for selected tour view (useWeather expects non-null Tour)
  const { data: selectedTourForecast } = useWeather(selectedTour ?? tours[0]);

  // Pick first loaded forecast as representative
  const repIdx = weatherQueries.findIndex((q) => q.data != null);
  const repForecast = repIdx >= 0 ? (weatherQueries[repIdx].data as WeatherForecast) : null;
  const repTour = repIdx >= 0 ? tours[repIdx] : tours[0];

  // Aggregated best-of-all-tours favorability per hour
  const FAV_RANK: Record<Favorability, number> = { more: 2, caution: 1, less: 0 };
  const aggregatedFavorability = useMemo(() => {
    if (!repForecast) return null;
    const result: Favorability[] = new Array(repForecast.hourly.length);
    for (let h = 0; h < repForecast.hourly.length; h++) {
      let bestRank = -1;
      let bestFav: Favorability = 'less';
      for (let t = 0; t < tours.length; t++) {
        const forecast = weatherQueries[t]?.data as WeatherForecast | undefined;
        if (!forecast?.hourly[h]) continue;
        const maxFt = metersToFeet(tours[t].max_elevation_m);
        const minFt = metersToFeet(tours[t].min_elevation_m);
        const { favorability } = assessHour(forecast.hourly[h], maxFt, minFt);
        const rank = FAV_RANK[favorability];
        if (rank > bestRank) { bestRank = rank; bestFav = favorability; }
        if (bestRank === 2) break;
      }
      result[h] = bestFav;
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repForecast, weatherQueries]);

  // Decide which forecast/tour to show
  const timelineForecast = (selectedTour ? (selectedTourForecast as WeatherForecast | undefined) : null) ?? repForecast;
  const timelineTour = selectedTour ?? repTour;

  if (!timelineForecast) {
    return (
      <div>
        <div className="rounded-xl bg-white/90 px-3 py-3 shadow-lg ring-1 ring-gray-200/60 backdrop-blur-sm">
          <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl bg-white/90 px-1 py-2 shadow-lg ring-1 ring-gray-200/60 backdrop-blur-sm md:px-3 md:py-3" data-tour-step="timeline">
        <OverviewTimeline
          forecast={timelineForecast}
          tour={timelineTour}
          selectedHour={selectedForecastHour}
          onSelectHour={setSelectedForecastHour}
          aggregatedFavorability={selectedTour ? null : aggregatedFavorability}
          locationForecast={mapWeather}
        />
      </div>
    </div>
  );
}
