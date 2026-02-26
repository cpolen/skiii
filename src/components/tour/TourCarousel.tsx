'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import { useAllToursConditions } from '@/hooks/useAllToursConditions';
import { useAllToursWeather } from '@/hooks/useAllToursWeather';
import { classifySnow } from '@/lib/analysis/snow-type';
import type { SnowType } from '@/lib/analysis/snow-type';
import { haversineM } from '@/lib/geo';
import { CarouselCard } from './CarouselCard';
import { SnowConditionsModal } from '@/components/ui/SnowConditionsModal';
import type { WeatherForecast } from '@/lib/types/conditions';

/** Difficulty levels that have at least one tour. */
const AVAILABLE_DIFFICULTIES = (['beginner', 'intermediate', 'advanced', 'expert'] as const)
  .filter((d) => tours.some((t) => t.difficulty === d));

const CARD_W = 200; // card width (matches CarouselCard inline width)
const CARD_GAP = 12; // gap between cards (matches Tailwind gap-3)
const CARD_STRIDE = CARD_W + CARD_GAP; // 212px per card slot

/**
 * Surfline-style always-visible carousel of tour cards, sorted by conditions score.
 * Shows difficulty filter pills + corn/powder shortcuts in the header.
 * Positioned above the FloatingTimeline.
 */
export function TourCarousel() {
  const selectTour = useMapStore((s) => s.selectTour);
  const setActiveCarouselIndex = useMapStore((s) => s.setActiveCarouselIndex);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);
  const center = useMapStore((s) => s.center);

  const conditionFilter = useMapStore((s) => s.conditionFilter);
  const setConditionFilter = useMapStore((s) => s.setConditionFilter);
  const setFilteredTourSlugs = useMapStore((s) => s.setFilteredTourSlugs);

  const [diffFilter, setDiffFilter] = useState<string | null>(null);
  const [disabledTooltip, setDisabledTooltip] = useState<'corn' | 'powder' | null>(null);
  const [snowModal, setSnowModal] = useState<{ type: SnowType; detail: string } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tourConditions = useAllToursConditions();
  const weatherQueries = useAllToursWeather();

  // Pre-compute each tour's start coordinate (stable across renders)
  const tourStarts = useMemo(() => {
    return tours.map((tour) => {
      const firstCoord = tour.variants[0]?.route.geometry.coordinates[0] as
        | [number, number]
        | undefined;
      return firstCoord ?? (tour.trailhead.geometry.coordinates as [number, number]);
    });
  }, []);

  // Sort tours by distance from map center (closest first)
  const sortedIndices = useMemo(() => {
    return tours
      .map((_, i) => i)
      .sort((a, b) => {
        const distA = haversineM(center, tourStarts[a]);
        const distB = haversineM(center, tourStarts[b]);
        return distA - distB;
      });
  }, [center, tourStarts]);

  // Filter by difficulty + condition
  const filteredIndices = useMemo(() => {
    return sortedIndices.filter((i) => {
      if (diffFilter && tours[i].difficulty !== diffFilter) return false;
      if (conditionFilter && tourConditions[i]?.snowType?.type !== conditionFilter) return false;
      return true;
    });
  }, [sortedIndices, diffFilter, conditionFilter, tourConditions]);

  // Map each tour slug → its visual rank in the sorted/filtered list.
  // Rendering in a FIXED order (tours array) while varying only the transform
  // prevents React from reordering DOM nodes via insertBefore, which would
  // break CSS transitions. Every card animates reliably because React only
  // updates the inline style — it never moves the DOM element.
  const positionMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredIndices.forEach((tourIdx, rank) => {
      map.set(tours[tourIdx].slug, rank);
    });
    return map;
  }, [filteredIndices]);

  // Reset scroll to show closest card when sort changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
  }, [filteredIndices]);

  // Sync scores to the map store for marker colors
  const setTourScores = useMapStore((s) => s.setTourScores);
  useEffect(() => {
    const scores: Record<string, number> = {};
    tours.forEach((tour, i) => {
      const c = tourConditions[i]?.conditions;
      scores[tour.slug] = c ? c.composite : -1;
    });
    setTourScores(scores);
  }, [tourConditions, setTourScores]);

  // Detect centered card on scroll for marker highlighting
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / CARD_STRIDE);
    const clamped = Math.max(0, Math.min(filteredIndices.length - 1, idx));
    setActiveCarouselIndex(clamped);
  }, [filteredIndices.length, setActiveCarouselIndex]);

  // Corn/powder scanning
  const bestConditions = useMemo(() => {
    let corn: { tourIdx: number; hour: number } | null = null;
    let powder: { tourIdx: number; hour: number } | null = null;
    const nowMs = Date.now();

    for (let ti = 0; ti < tours.length; ti++) {
      const forecast = weatherQueries[ti]?.data ?? null;
      if (!forecast) continue;
      const tour = tours[ti];
      const variant = tour.variants[0];
      if (!variant) continue;

      let startH = 0;
      for (let i = 0; i < forecast.hourly.length; i++) {
        if (new Date(forecast.hourly[i].time).getTime() >= nowMs) {
          startH = i;
          break;
        }
      }

      for (let h = startH; h < forecast.hourly.length; h++) {
        const hourData = forecast.hourly[h];
        if (!hourData.is_day) continue;
        const windMph = hourData.wind_speed_80m * 0.621371;
        if (windMph >= 40) continue;

        const snow = classifySnow(forecast as WeatherForecast, tour, variant, h);
        if (!corn && snow.type === 'corn') corn = { tourIdx: ti, hour: h };
        if (!powder && snow.type === 'powder') powder = { tourIdx: ti, hour: h };
        if (corn && powder) break;
      }
      if (corn && powder) break;
    }
    return { corn, powder };
  }, [weatherQueries]);

  const handleGoToPowder = useCallback(() => {
    if (conditionFilter === 'powder') {
      setConditionFilter(null);
      setFilteredTourSlugs(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.powder) return;
    setConditionFilter('powder');
    setSelectedForecastHour(bestConditions.powder.hour);
  }, [conditionFilter, bestConditions.powder, setSelectedForecastHour, setConditionFilter, setFilteredTourSlugs]);

  const handleGoToCorn = useCallback(() => {
    if (conditionFilter === 'corn') {
      setConditionFilter(null);
      setFilteredTourSlugs(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.corn) return;
    setConditionFilter('corn');
    setSelectedForecastHour(bestConditions.corn.hour);
  }, [conditionFilter, bestConditions.corn, setSelectedForecastHour, setConditionFilter, setFilteredTourSlugs]);

  // Clear condition filter when user manually changes timeline
  useEffect(() => {
    if (!conditionFilter) return;
    const expected = conditionFilter === 'corn'
      ? bestConditions.corn?.hour
      : bestConditions.powder?.hour;
    if (selectedForecastHour !== expected) {
      setConditionFilter(null);
      setFilteredTourSlugs(null);
    }
  }, [selectedForecastHour, conditionFilter, bestConditions, setConditionFilter, setFilteredTourSlugs]);

  // Sync filtered tour slugs to store for map marker filtering
  useEffect(() => {
    if (!conditionFilter) return;
    const slugs = filteredIndices.map((i) => tours[i].slug);
    setFilteredTourSlugs(slugs);
  }, [conditionFilter, filteredIndices, setFilteredTourSlugs]);

  // Dismiss tooltip on any outside tap
  useEffect(() => {
    if (!disabledTooltip) return;
    const dismiss = () => setDisabledTooltip(null);
    window.addEventListener('pointerdown', dismiss);
    return () => window.removeEventListener('pointerdown', dismiss);
  }, [disabledTooltip]);

  // Clean up tooltip timer on unmount
  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  return (
    <div>
      {/* Filter pills */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {/* {AVAILABLE_DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => setDiffFilter(diffFilter === d ? null : d)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
              diffFilter === d
                ? 'bg-blue-600 text-white'
                : 'bg-white/80 text-gray-600 ring-1 ring-gray-200/60'
            }`}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))} */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (bestConditions.powder) { handleGoToPowder(); return; }
              setDisabledTooltip((p) => p === 'powder' ? null : 'powder');
              if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
              tooltipTimer.current = setTimeout(() => setDisabledTooltip(null), 3000);
            }}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
              conditionFilter === 'powder'
                ? 'bg-sky-600 text-white'
                : bestConditions.powder
                  ? 'bg-white/80 text-gray-600 ring-1 ring-gray-200/60'
                  : 'bg-white/40 text-gray-400 ring-1 ring-gray-200/40'
            }`}
          >
            {'\u2744'} Powder
          </button>
          {disabledTooltip === 'powder' && (
            <div className="absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1.5 text-[10px] text-white shadow-lg">
              No powder in the 72-hr forecast
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (bestConditions.corn) { handleGoToCorn(); return; }
              setDisabledTooltip((p) => p === 'corn' ? null : 'corn');
              if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
              tooltipTimer.current = setTimeout(() => setDisabledTooltip(null), 3000);
            }}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
              conditionFilter === 'corn'
                ? 'bg-amber-600 text-white'
                : bestConditions.corn
                  ? 'bg-white/80 text-gray-600 ring-1 ring-gray-200/60'
                  : 'bg-white/40 text-gray-400 ring-1 ring-gray-200/40'
            }`}
          >
            {'\uD83C\uDF3D'} Corn
          </button>
          {disabledTooltip === 'corn' && (
            <div className="absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1.5 text-[10px] text-white shadow-lg">
              No corn in the 72-hr forecast
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable card carousel — cards rendered in FIXED order (tours array)
          with absolute positioning. Visual rank is controlled solely by
          translateX, so React never reorders DOM nodes and CSS transitions
          fire reliably for every card. */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className="relative"
          style={{
            width: Math.max(filteredIndices.length * CARD_STRIDE - CARD_GAP, 0),
            height: 96,
          }}
        >
          {tours.map((tour, tourIdx) => {
            const rank = positionMap.get(tour.slug);
            if (rank === undefined) return null; // filtered out by difficulty
            const entry = tourConditions[tourIdx];
            const forecast = weatherQueries[tourIdx]?.data ?? null;
            const hourly = forecast && selectedForecastHour != null
              ? forecast.hourly[selectedForecastHour]
              : undefined;
            return (
              <button
                key={tour.slug}
                onClick={() => selectTour(tour.slug)}
                className="absolute top-0 left-0 text-left"
                style={{
                  width: CARD_W,
                  transform: `translateX(${rank * CARD_STRIDE}px)`,
                  transition: 'transform 350ms ease-out',
                }}
                {...(rank === 0 ? { 'data-tour-step': 'tour-list' } : {})}
              >
                <CarouselCard
                  tour={tour}
                  conditions={entry?.conditions}
                  snowType={entry?.snowType}
                  hourly={hourly}
                  isLoading={entry?.isLoading ?? true}
                  isActive={rank === useMapStore.getState().activeCarouselIndex}
                  onSnowTypeClick={(type, detail) => setSnowModal({ type, detail })}
                />
              </button>
            );
          })}
        </div>
      </div>

      <SnowConditionsModal
        open={snowModal != null}
        activeType={snowModal?.type ?? null}
        activeDetail={snowModal?.detail}
        onClose={() => setSnowModal(null)}
      />
    </div>
  );
}
