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
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { rawHourScore, hourScoreTo100, scoreAvalanche, scoreTerrain, resolveAvyDay } from '@/lib/analysis/scoring';

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

  const selectedVariantIndex = useMapStore((s) => s.selectedVariantIndex);

  // Weather for the map center point (dynamic to location dot)
  const { data: mapWeather } = useMapWeather();
  const { data: avyData, isLoading: avyLoading } = useAvyForecast();

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

  // Per-hour composite scores for the selected tour.
  // Colors timeline blocks by the same composite band as the score gauge,
  // so blocks and gauge always agree (green/yellow/orange/red).
  const hourlyCompositeScores = useMemo(() => {
    if (!selectedTour || !selectedTourForecast) return null;
    // Wait for avy data to finish loading so we don't flash green (no-avy weights)
    // then switch to yellow (with-avy weights) once it arrives.
    if (avyLoading) return null;
    const forecast = selectedTourForecast as WeatherForecast;
    const variant = selectedTour.variants[selectedVariantIndex] ?? selectedTour.variants[0];
    const tourMaxFt = metersToFeet(selectedTour.max_elevation_m);
    const tourMinFt = metersToFeet(selectedTour.min_elevation_m);
    const zone = avyData?.zones?.[0] ?? null;
    const detailed = avyData?.detailed ?? null;
    const { score: terrainScore } = scoreTerrain(selectedTour, variant);

    return forecast.hourly.map((h) => {
      const wxScore = hourScoreTo100(rawHourScore(h, tourMaxFt, tourMinFt));
      const avyDay = resolveAvyDay(h.time, detailed);
      const avyScore = scoreAvalanche(detailed, zone, selectedTour, variant, avyDay);
      if (avyScore != null) {
        return Math.round(avyScore * 0.50 + wxScore * 0.35 + terrainScore * 0.15);
      }
      return Math.round(wxScore * 0.70 + terrainScore * 0.30);
    });
  }, [selectedTour, selectedTourForecast, selectedVariantIndex, avyData, avyLoading]);

  // Decide which forecast/tour to show.
  // When a tour is selected, don't fall back to repForecast — wait for the
  // selected tour's own forecast so we never show the wrong tour's weather.
  const timelineForecast = selectedTour
    ? (selectedTourForecast as WeatherForecast | undefined) ?? null
    : repForecast;
  const timelineTour = selectedTour ?? repTour;

  // Show loading shimmer when:
  // - No forecast data at all, OR
  // - Tour selected but composite scores aren't ready yet (forecast or avy still loading)
  if (!timelineForecast || (selectedTour && !hourlyCompositeScores)) {
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
          hourlyCompositeScores={hourlyCompositeScores}
          locationForecast={mapWeather}
        />
      </div>
    </div>
  );
}
