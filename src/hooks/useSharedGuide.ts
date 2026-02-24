import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/map';
import { useGuideStore } from '@/stores/guide';
import { useMutation } from '@tanstack/react-query';
import { buildGuidePayload } from '@/lib/guide/context';
import type { GuidePayload } from '@/lib/guide/context';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';
import type { WeatherForecast } from '@/lib/types/conditions';
import type { AvyForecastResponse } from '@/hooks/useAvyForecast';

interface TourConditionEntry {
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading: boolean;
}

interface UseSharedGuideProps {
  tourConditions: TourConditionEntry[];
  weatherQueries: { data?: WeatherForecast; isLoading?: boolean }[];
  avyData: AvyForecastResponse | undefined;
  sortedTourIndices: number[];
}

/**
 * Fires a single AI guide message when the app loads from a shared URL.
 * No-op when isSharedView is false (normal browsing).
 */
export function useSharedGuide({
  tourConditions,
  weatherQueries,
  avyData,
  sortedTourIndices,
}: UseSharedGuideProps) {
  const isSharedView = useGuideStore((s) => s.isSharedView);
  const setMessage = useGuideStore((s) => s.setMessage);
  const setAILoading = useGuideStore((s) => s.setAILoading);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  const hasFired = useRef(false);

  const aiMutation = useMutation({
    mutationFn: async (payload: GuidePayload): Promise<string | null> => {
      const res = await fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.message ?? null;
    },
    onMutate: () => setAILoading(true),
    onSettled: () => setAILoading(false),
  });

  useEffect(() => {
    if (!isSharedView || hasFired.current || !selectedTourSlug) return;

    // Wait for conditions data to be ready
    const anyReady = tourConditions.some((tc) => tc.conditions != null);
    if (!anyReady) return;

    hasFired.current = true;

    // Instant placeholder while AI loads
    setMessage('Checking conditions for this tour…');

    const payload = buildGuidePayload(
      'tour-select',
      selectedTourSlug,
      selectedForecastHour,
      sortedTourIndices,
      tourConditions,
      weatherQueries,
      avyData,
    );

    aiMutation.mutate(payload, {
      onSuccess: (message) => {
        if (message) setMessage(message);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharedView, selectedTourSlug, tourConditions, sortedTourIndices]);
}
