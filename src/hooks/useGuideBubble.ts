import { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores/map';
import { useGuideStore } from '@/stores/guide';
import { useMutation } from '@tanstack/react-query';
import {
  generateAppLoadMessage,
  generateTourSelectMessage,
  generateTimelineScrubMessage,
} from '@/lib/guide/templates';
import {
  contextKey,
  buildAppLoadContext,
  buildTourSelectContext,
  buildTimelineScrubContext,
  buildGuidePayload,
} from '@/lib/guide/context';
import type { GuidePayload } from '@/lib/guide/context';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';
import type { WeatherForecast } from '@/lib/types/conditions';
import type { AvyForecastResponse } from '@/hooks/useAvyForecast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourConditionEntry {
  conditions?: ConditionsAssessment;
  snowType?: SnowClassification;
  isLoading: boolean;
}

interface UseGuideBubbleProps {
  tourConditions: TourConditionEntry[];
  weatherQueries: { data?: WeatherForecast; isLoading?: boolean }[];
  avyData: AvyForecastResponse | undefined;
  sortedTourIndices: number[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGuideBubble({
  tourConditions,
  weatherQueries,
  avyData,
  sortedTourIndices,
}: UseGuideBubbleProps) {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  const setMessage = useGuideStore((s) => s.setMessage);
  const setAILoading = useGuideStore((s) => s.setAILoading);
  const setLastContextKey = useGuideStore((s) => s.setLastContextKey);

  const hasInitialized = useRef(false);
  const previousComposite = useRef<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAIContextKey = useRef('');

  // --- AI mutation ---
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

  // Stable reference to fire AI call with staleness check
  const fireAI = useCallback(
    (payload: GuidePayload, key: string) => {
      lastAIContextKey.current = key;
      aiMutation.mutate(payload, {
        onSuccess: (message) => {
          // Discard if context has changed since we fired
          if (message && lastAIContextKey.current === key) {
            setMessage(message);
          }
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setMessage],
  );

  // --- App load trigger ---
  useEffect(() => {
    if (hasInitialized.current) return;

    // Wait for data to be ready
    const anyLoading = tourConditions.some((tc) => tc.isLoading);
    const anyReady = tourConditions.some((tc) => tc.conditions != null);
    if (anyLoading && !anyReady) return;
    if (!anyReady) return;

    hasInitialized.current = true;

    const ctx = buildAppLoadContext(sortedTourIndices, tourConditions, weatherQueries, avyData);
    if (!ctx) return;

    const msg = generateAppLoadMessage(ctx);
    const key = contextKey('app-load', null, null);
    setMessage(msg);
    setLastContextKey(key);
    previousComposite.current = ctx.conditions.composite;

    // Fire AI enhancement
    const payload = buildGuidePayload('app-load', null, null, sortedTourIndices, tourConditions, weatherQueries, avyData);
    fireAI(payload, key);
  }, [tourConditions, sortedTourIndices, weatherQueries, avyData, setMessage, setLastContextKey, fireAI]);

  // --- Tour selection trigger ---
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!selectedTourSlug) {
      // Deselected — revert to app-load style overview
      const ctx = buildAppLoadContext(sortedTourIndices, tourConditions, weatherQueries, avyData);
      if (!ctx) return;
      const msg = generateAppLoadMessage(ctx);
      const key = contextKey('app-load', null, selectedForecastHour);
      setMessage(msg);
      setLastContextKey(key);
      previousComposite.current = ctx.conditions.composite;

      const payload = buildGuidePayload('app-load', null, selectedForecastHour, sortedTourIndices, tourConditions, weatherQueries, avyData);
      fireAI(payload, key);
      return;
    }

    const ctx = buildTourSelectContext(selectedTourSlug, sortedTourIndices, tourConditions, weatherQueries, avyData, selectedForecastHour);
    if (!ctx) return;

    const msg = generateTourSelectMessage(ctx);
    const key = contextKey('tour-select', selectedTourSlug, selectedForecastHour);
    setMessage(msg);
    setLastContextKey(key);
    previousComposite.current = ctx.conditions.composite;

    // Fire AI immediately (no debounce for tour selection)
    const payload = buildGuidePayload('tour-select', selectedTourSlug, selectedForecastHour, sortedTourIndices, tourConditions, weatherQueries, avyData);
    fireAI(payload, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTourSlug]);

  // --- Timeline scrub trigger ---
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (selectedForecastHour == null) return;

    const ctx = buildTimelineScrubContext(
      selectedTourSlug,
      selectedForecastHour,
      sortedTourIndices,
      tourConditions,
      weatherQueries,
      previousComposite.current,
    );
    if (!ctx) return;

    // Template message — instant
    const msg = generateTimelineScrubMessage(ctx);
    const key = contextKey('timeline-scrub', selectedTourSlug, selectedForecastHour);
    setMessage(msg);
    setLastContextKey(key);
    previousComposite.current = ctx.conditions.composite;

    // Debounce AI call — 500ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const payload = buildGuidePayload('timeline-scrub', selectedTourSlug, selectedForecastHour, sortedTourIndices, tourConditions, weatherQueries, avyData);
      fireAI(payload, key);
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForecastHour]);
}
