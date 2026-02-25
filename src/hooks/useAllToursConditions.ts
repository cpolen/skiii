import { useMemo } from 'react';
import { tours } from '@/data/tours';
import { useAllToursWeather } from './useAllToursWeather';
import { useAvyForecast } from './useAvyForecast';
import { useMapStore } from '@/stores/map';
import { assessConditions } from '@/lib/analysis/scoring';
import { classifySnow } from '@/lib/analysis/snow-type';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';

export interface TourConditionsEntry {
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading: boolean;
}

/**
 * Shared hook that computes conditions + snow type for every tour at the
 * currently selected forecast hour. Extracted from TourPanel so both map
 * markers and UI components can consume the same data.
 */
export function useAllToursConditions(): TourConditionsEntry[] {
  const weatherQueries = useAllToursWeather();
  const { data: avyData } = useAvyForecast();
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  // useQueries() returns a new array ref every render even when data hasn't
  // changed. Build a stable key from the actual data timestamps so the
  // expensive useMemo below only recomputes when data genuinely updates.
  const weatherDataKey = useMemo(
    () => weatherQueries.map((q) => `${q.dataUpdatedAt}:${q.isLoading}`).join(','),
    [weatherQueries],
  );

  return useMemo(() => {
    const zone = avyData?.zones?.[0] ?? null;
    const detailed = avyData?.detailed ?? null;

    return tours.map((tour, i) => {
      const forecast = weatherQueries[i]?.data ?? null;
      const isLoading = weatherQueries[i]?.isLoading ?? true;
      const variant = tour.variants[0];

      let conditions: ConditionsAssessment | undefined;
      let snowType: SnowClassification | undefined;

      if (forecast && variant) {
        conditions = assessConditions(forecast, { detailed, zone }, tour, variant, selectedForecastHour);
        snowType = classifySnow(forecast, tour, variant, selectedForecastHour);
      }

      return { conditions, snowType, isLoading };
    });
    // weatherQueries is accessed inside but we use weatherDataKey as a stable
    // proxy — the array ref changes every render but data only changes when
    // dataUpdatedAt or isLoading changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherDataKey, avyData, selectedForecastHour]);
}
