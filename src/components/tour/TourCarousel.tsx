'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import { useAllToursConditions } from '@/hooks/useAllToursConditions';
import { useAllToursWeather } from '@/hooks/useAllToursWeather';
import { classifySnow } from '@/lib/analysis/snow-type';
import { haversineM } from '@/lib/geo';
import { CarouselCard } from './CarouselCard';
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

  const [diffFilter, setDiffFilter] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<'corn' | 'powder' | null>(null);
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

  // Filter by difficulty
  const filteredIndices = useMemo(() => {
    return sortedIndices.filter((i) => {
      if (diffFilter && tours[i].difficulty !== diffFilter) return false;
      return true;
    });
  }, [sortedIndices, diffFilter]);

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
    if (activeCondition === 'powder') {
      setActiveCondition(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.powder) return;
    setActiveCondition('powder');
    setSelectedForecastHour(bestConditions.powder.hour);
  }, [activeCondition, bestConditions.powder, setSelectedForecastHour]);

  const handleGoToCorn = useCallback(() => {
    if (activeCondition === 'corn') {
      setActiveCondition(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.corn) return;
    setActiveCondition('corn');
    setSelectedForecastHour(bestConditions.corn.hour);
  }, [activeCondition, bestConditions.corn, setSelectedForecastHour]);

  // Clear active condition when user manually changes timeline
  useEffect(() => {
    if (!activeCondition) return;
    const expected = activeCondition === 'corn'
      ? bestConditions.corn?.hour
      : bestConditions.powder?.hour;
    if (selectedForecastHour !== expected) {
      setActiveCondition(null);
    }
  }, [selectedForecastHour, activeCondition, bestConditions]);

  return (
    <div>
      {/* Filter pills */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {AVAILABLE_DIFFICULTIES.map((d) => (
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
        ))}
        {bestConditions.powder && (
          <button
            onClick={handleGoToPowder}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
              activeCondition === 'powder'
                ? 'bg-sky-600 text-white'
                : 'bg-white/80 text-gray-600 ring-1 ring-gray-200/60'
            }`}
          >
            {'\u2744'} Powder
          </button>
        )}
        {bestConditions.corn && (
          <button
            onClick={handleGoToCorn}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap backdrop-blur-sm transition-colors ${
              activeCondition === 'corn'
                ? 'bg-amber-600 text-white'
                : 'bg-white/80 text-gray-600 ring-1 ring-gray-200/60'
            }`}
          >
            {'\uD83C\uDF3D'} Corn
          </button>
        )}
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
                  isLoading={entry?.isLoading ?? true}
                  isActive={rank === useMapStore.getState().activeCarouselIndex}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
