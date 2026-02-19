'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useMapStore } from '@/stores/map';
import { TourCard } from './TourCard';
import { SidebarConditions } from './SidebarConditions';
import { OverviewTimeline } from './OverviewTimeline';
import { tours } from '@/data/tours';
import { useAllToursWeather } from '@/hooks/useAllToursWeather';
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { assessConditions } from '@/lib/analysis/scoring';
import { classifySnow } from '@/lib/analysis/snow-type';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification } from '@/lib/analysis/snow-type';
import type { WeatherForecast } from '@/lib/types/conditions';
import { kmhToMph, celsiusToFahrenheit } from '@/lib/types/conditions';
import { getCurrentHour } from '@/hooks/useWeather';
import type { Tour } from '@/lib/types/tour';

export function TourPanel() {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectTour = useMapStore((s) => s.selectTour);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const setSelectedForecastHour = useMapStore((s) => s.setSelectedForecastHour);
  const [searchQuery, setSearchQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<string | null>(null);

  const selectedTour = selectedTourSlug
    ? tours.find((t) => t.slug === selectedTourSlug)
    : null;

  // Batch-fetch weather for all tours (cache-shared with per-tour useWeather)
  const weatherQueries = useAllToursWeather();
  const { data: avyData } = useAvyForecast();

  // Compute conditions + snow type for each tour at the selected hour
  const tourConditions = useMemo(() => {
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
  }, [weatherQueries, avyData, selectedForecastHour]);

  // Sort tours by composite score (best first) — always, so best conditions appear at top
  const sortedTourIndices = useMemo(() => {
    const indices = tours.map((_, i) => i);
    return [...indices].sort((a, b) => {
      const scoreA = tourConditions[a]?.conditions?.composite ?? -1;
      const scoreB = tourConditions[b]?.conditions?.composite ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a - b; // stable tiebreaker
    });
  }, [tourConditions]);

  // Filter tours by search query and difficulty
  const filteredIndices = useMemo(() => {
    return sortedTourIndices.filter((i) => {
      const tour = tours[i];
      if (searchQuery && !tour.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (diffFilter && tour.difficulty !== diffFilter) return false;
      return true;
    });
  }, [sortedTourIndices, searchQuery, diffFilter]);

  // Sync top-3 ranked tour slugs to the store so the map can highlight them
  const setTopTourSlugs = useMapStore((s) => s.setTopTourSlugs);
  useEffect(() => {
    if (selectedForecastHour == null) {
      setTopTourSlugs([]);
      return;
    }
    const top3 = sortedTourIndices.slice(0, 3).map((i) => tours[i].slug);
    setTopTourSlugs(top3);
  }, [sortedTourIndices, selectedForecastHour, setTopTourSlugs]);

  // Pick first loaded forecast as representative for the overview timeline
  const repIdx = weatherQueries.findIndex((q) => q.data != null);
  const repForecast = repIdx >= 0 ? (weatherQueries[repIdx].data as WeatherForecast) : null;
  const repTour = repIdx >= 0 ? tours[repIdx] : tours[0];

  return (
    <>
      {/* Desktop side panel */}
      <aside className="hidden md:flex md:h-full md:w-[400px] md:flex-col md:border-l md:border-gray-200 md:bg-white" aria-label="Tour conditions panel">
        <div className="border-b border-gray-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Skiii</h1>
          <p className="text-xs text-gray-500">Backcountry Tour Guide - Lake Tahoe</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedTour ? (
            <div>
              <button
                onClick={() => selectTour(null)}
                className="flex items-center gap-1 px-4 py-2 text-xs text-blue-600 hover:text-blue-800"
              >
                &larr; All tours
              </button>
              <SidebarConditions tour={selectedTour} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              <ConditionsBanner forecast={repForecast} avyData={avyData} />
              {repForecast ? (
                <OverviewTimeline
                  forecast={repForecast}
                  tour={repTour}
                  selectedHour={selectedForecastHour}
                  onSelectHour={setSelectedForecastHour}
                />
              ) : (
                <div className="mb-2 h-16 animate-pulse rounded-lg bg-gray-100" />
              )}
              <TourSearchFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                diffFilter={diffFilter}
                onDiffFilterChange={setDiffFilter}
                totalCount={tours.length}
                filteredCount={filteredIndices.length}
              />
              {filteredIndices.map((i, rankIndex) => {
                const tour = tours[i];
                return (
                  <button
                    key={tour.slug}
                    onClick={() => selectTour(tour.slug)}
                    className="w-full text-left"
                  >
                    <TourCard
                      tour={tour}
                      conditions={tourConditions[i]?.conditions}
                      snowType={tourConditions[i]?.snowType}
                      isLoading={tourConditions[i]?.isLoading}
                      rank={rankIndex + 1}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-2">
          <p className="text-[10px] leading-tight text-gray-500">
            This is a planning tool, not a safety assessment. Always check the full Sierra
            Avalanche Center forecast and complete avalanche education.
          </p>
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      <MobileBottomSheet
        selectedTour={selectedTour}
        onBack={() => selectTour(null)}
        onSelectTour={(slug) => selectTour(slug)}
        tourConditions={tourConditions}
        filteredIndices={filteredIndices}
        repForecast={repForecast}
        repTour={repTour}
        selectedForecastHour={selectedForecastHour}
        onSelectHour={setSelectedForecastHour}
        avyData={avyData}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        diffFilter={diffFilter}
        onDiffFilterChange={setDiffFilter}
        totalCount={tours.length}
      />
    </>
  );
}

function MobileBottomSheet({
  selectedTour,
  onBack,
  onSelectTour,
  tourConditions,
  filteredIndices,
  repForecast,
  repTour,
  selectedForecastHour,
  onSelectHour,
  avyData,
  searchQuery,
  onSearchChange,
  diffFilter,
  onDiffFilterChange,
  totalCount,
}: {
  selectedTour: ReturnType<typeof tours.find> | null;
  onBack: () => void;
  onSelectTour: (slug: string) => void;
  tourConditions: { conditions?: ConditionsAssessment; snowType?: SnowClassification; isLoading: boolean }[];
  filteredIndices: number[];
  repForecast: WeatherForecast | null;
  repTour: Tour;
  selectedForecastHour: number | null;
  onSelectHour: (hour: number | null) => void;
  avyData: { zones?: { danger_level: number }[] } | undefined;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  diffFilter: string | null;
  onDiffFilterChange: (d: string | null) => void;
  totalCount: number;
}) {
  const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('half');
  const startY = useRef(0);
  const startHeightRef = useRef<'collapsed' | 'half' | 'full'>('half');

  const heightClass = {
    collapsed: 'max-h-16',
    half: 'max-h-[45dvh] landscape:max-h-[30dvh]',
    full: 'max-h-[85dvh] landscape:max-h-[60dvh]',
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 md:hidden">
      <div className={`mx-2 mb-2 ${heightClass[sheetHeight]} overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-[max-height] duration-200`}>
        {/* Drag handle */}
        <div
          className="sticky top-0 z-10 flex justify-center bg-white pb-1 pt-2 cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => {
            startY.current = e.touches[0].clientY;
            startHeightRef.current = sheetHeight;
          }}
          onTouchEnd={(e) => {
            const dy = startY.current - e.changedTouches[0].clientY;
            if (dy > 50) {
              setSheetHeight(startHeightRef.current === 'collapsed' ? 'half' : 'full');
            } else if (dy < -50) {
              setSheetHeight(startHeightRef.current === 'full' ? 'half' : 'collapsed');
            }
          }}
          role="slider"
          aria-label="Resize panel"
          aria-valuetext={sheetHeight}
        >
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>

        {selectedTour ? (
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-4 py-1 text-xs text-blue-600"
            >
              &larr; All tours
            </button>
            <SidebarConditions tour={selectedTour} />
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-3 pb-3">
            <ConditionsBanner forecast={repForecast} avyData={avyData} />
            {repForecast ? (
              <OverviewTimeline
                forecast={repForecast}
                tour={repTour}
                selectedHour={selectedForecastHour}
                onSelectHour={onSelectHour}
              />
            ) : (
              <div className="mb-2 h-16 animate-pulse rounded-lg bg-gray-100" />
            )}
            <TourSearchFilter
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              diffFilter={diffFilter}
              onDiffFilterChange={onDiffFilterChange}
              totalCount={totalCount}
              filteredCount={filteredIndices.length}
            />
            {filteredIndices.map((i, rankIndex) => {
              const tour = tours[i];
              return (
                <button
                  key={tour.slug}
                  onClick={() => onSelectTour(tour.slug)}
                  className="w-full text-left"
                >
                  <TourCard
                    tour={tour}
                    conditions={tourConditions[i]?.conditions}
                    snowType={tourConditions[i]?.snowType}
                    isLoading={tourConditions[i]?.isLoading}
                    rank={rankIndex + 1}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TourSearchFilter({
  searchQuery,
  onSearchChange,
  diffFilter,
  onDiffFilterChange,
  totalCount,
  filteredCount,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  diffFilter: string | null;
  onDiffFilterChange: (d: string | null) => void;
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <div className="mb-1 space-y-2">
      <input
        type="search"
        placeholder="Search tours..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none"
        aria-label="Search tours by name"
      />
      <div className="flex items-center gap-1.5">
        {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDiffFilterChange(diffFilter === d ? null : d)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
              diffFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
            aria-label={`Filter by ${d}`}
            aria-pressed={diffFilter === d}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {filteredCount === totalCount
          ? `${totalCount} tours \u00B7 Ranked by conditions`
          : `${filteredCount} of ${totalCount} tours`}
      </p>
    </div>
  );
}

function ConditionsBanner({
  forecast,
  avyData,
}: {
  forecast: WeatherForecast | null;
  avyData: { zones?: { danger_level: number }[] } | undefined;
}) {
  if (!forecast) return null;

  const hour = getCurrentHour(forecast);
  const tempF = Math.round(celsiusToFahrenheit(hour.temperature_2m));
  const ridgeWindMph = Math.round(kmhToMph(hour.wind_speed_80m));
  const zone = avyData?.zones?.[0];
  const dangerLevel = zone?.danger_level;
  const dangerLabels: Record<number, string> = { 1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme' };
  const dangerColors: Record<number, string> = { 1: '#50B848', 2: '#FFF200', 3: '#F7941E', 4: '#ED1C24', 5: '#231F20' };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
      {dangerLevel && (
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dangerColors[dangerLevel] }} />
          <span className="font-medium">{dangerLabels[dangerLevel]} avy danger</span>
        </span>
      )}
      <span>{tempF}°F</span>
      <span>Ridge {ridgeWindMph} mph</span>
      {hour.snowfall > 0 && <span>Snowing</span>}
    </div>
  );
}
