'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useMapStore } from '@/stores/map';
import { useShallow } from 'zustand/react/shallow';
import { TourCard } from './TourCard';
import { SidebarConditions } from './SidebarConditions';
import { OverviewTimeline } from './OverviewTimeline';
import { tours } from '@/data/tours';
import { useAllToursWeather } from '@/hooks/useAllToursWeather';
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { assessConditions } from '@/lib/analysis/scoring';
import { classifySnow } from '@/lib/analysis/snow-type';
import { assessHour } from '@/lib/analysis/timing';
import type { Favorability } from '@/lib/analysis/timing';
import type { ConditionsAssessment } from '@/lib/analysis/scoring';
import type { SnowClassification, SnowType } from '@/lib/analysis/snow-type';
import { SnowConditionsModal } from '@/components/ui/SnowConditionsModal';
import type { WeatherForecast } from '@/lib/types/conditions';
import { kmhToMph, celsiusToFahrenheit, metersToFeet } from '@/lib/types/conditions';
import { getCurrentHour } from '@/hooks/useWeather';
// import { useGuideBubble } from '@/hooks/useGuideBubble';
import { useSharedGuide } from '@/hooks/useSharedGuide';
import type { Tour } from '@/lib/types/tour';

/** Difficulty levels that have at least one tour (static, computed once). */
const AVAILABLE_DIFFICULTIES = (['beginner', 'intermediate', 'advanced', 'expert'] as const)
  .filter((d) => tours.some((t) => t.difficulty === d));

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

  // Desktop content transition state
  const [desktopDisplayedTour, setDesktopDisplayedTour] = useState(selectedTour);
  const [desktopOpacity, setDesktopOpacity] = useState(1);
  const desktopScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTour?.slug === desktopDisplayedTour?.slug) return;
    setDesktopOpacity(0);
    const timer = setTimeout(() => {
      setDesktopDisplayedTour(selectedTour);
      desktopScrollRef.current?.scrollTo({ top: 0 });
      requestAnimationFrame(() => setDesktopOpacity(1));
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedTour, desktopDisplayedTour]);

  // Batch-fetch weather for all tours (cache-shared with per-tour useWeather)
  const weatherQueries = useAllToursWeather();
  const { data: avyData, isFetching: avyFetching } = useAvyForecast();
  const setLayerLoading = useMapStore((s) => s.setLayerLoading);

  // Expose weather + avy loading to the global layerLoading store
  const anyWeatherFetching = weatherQueries.some((q) => q.isFetching);
  useEffect(() => {
    setLayerLoading('weather', anyWeatherFetching);
    return () => { setLayerLoading('weather', false); };
  }, [anyWeatherFetching, setLayerLoading]);
  useEffect(() => {
    setLayerLoading('avalanche', avyFetching);
    return () => { setLayerLoading('avalanche', false); };
  }, [avyFetching, setLayerLoading]);

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

  // Per-tour: does this tour have any 'more' favorable daytime hours on the selected day?
  // When no hour selected → checks today. When a specific hour is selected → checks that day.
  const tourFavorableForDay = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    // Determine reference day from selected hour or default to today
    let refDateStr = now.toDateString();
    let isToday = true;
    if (selectedForecastHour != null) {
      const anyForecast = weatherQueries.find(q => q.data)?.data as WeatherForecast | undefined;
      if (anyForecast?.hourly[selectedForecastHour]) {
        refDateStr = new Date(anyForecast.hourly[selectedForecastHour].time).toDateString();
        isToday = refDateStr === now.toDateString();
      }
    }
    return tours.map((tour, i) => {
      const forecast = weatherQueries[i]?.data as WeatherForecast | undefined;
      if (!forecast) return false;
      const maxFt = metersToFeet(tour.max_elevation_m);
      const minFt = metersToFeet(tour.min_elevation_m);
      return forecast.hourly.some((h) => {
        const t = new Date(h.time);
        if (t.toDateString() !== refDateStr) return false;
        if (isToday && t.getTime() < nowMs) return false;
        return h.is_day && assessHour(h, maxFt, minFt).favorability === 'more';
      });
    });
  }, [weatherQueries, selectedForecastHour]);

  // Divider label for the "not favorable" section
  const notFavorableLabel = useMemo(() => {
    if (selectedForecastHour == null) return 'No favorable tours today';
    const anyForecast = weatherQueries.find(q => q.data)?.data as WeatherForecast | undefined;
    if (!anyForecast?.hourly[selectedForecastHour]) return 'No favorable tours today';
    const d = new Date(anyForecast.hourly[selectedForecastHour].time);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'No favorable tours today';
    const tomorrow = new Date(now.getTime() + 86400000);
    if (d.toDateString() === tomorrow.toDateString()) return 'No favorable tours tomorrow';
    return `No favorable tours ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
  }, [weatherQueries, selectedForecastHour]);

  // Sort tours: favorable-for-day first, then rest — both groups by composite score
  const sortedTourIndices = useMemo(() => {
    const indices = tours.map((_, i) => i);
    return [...indices].sort((a, b) => {
      const favA = tourFavorableForDay[a] ? 1 : 0;
      const favB = tourFavorableForDay[b] ? 1 : 0;
      if (favB !== favA) return favB - favA;
      const scoreA = tourConditions[a]?.conditions?.composite ?? -1;
      const scoreB = tourConditions[b]?.conditions?.composite ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a - b; // stable tiebreaker
    });
  }, [tourConditions, tourFavorableForDay]);

  // Feed the guide bubble with current conditions data
  // useGuideBubble({ tourConditions, weatherQueries, avyData, sortedTourIndices });
  useSharedGuide({ tourConditions, weatherQueries, avyData, sortedTourIndices });

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

  // Per-hour best-of-all-tours favorability for the overview timeline
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

  // Selected tour's forecast (for mobile timeline footer when a tour is selected)
  const selectedTourIdx = selectedTour ? tours.findIndex((t) => t.slug === selectedTour.slug) : -1;
  const selectedTourForecast = selectedTourIdx >= 0
    ? (weatherQueries[selectedTourIdx]?.data as WeatherForecast | undefined) ?? null
    : null;

  // Scan all tours × future hours for first corn / powder window
  // Past data is used by classifySnow for lookback (48h snowfall, overnight refreeze, etc.)
  // but we only show results for hours from now onward (can't ski yesterday's powder)
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

      // Find the first hour at or after now
      let startH = 0;
      for (let i = 0; i < forecast.hourly.length; i++) {
        if (new Date(forecast.hourly[i].time).getTime() >= nowMs) {
          startH = i;
          break;
        }
      }

      for (let h = startH; h < forecast.hourly.length; h++) {
        const hourData = forecast.hourly[h];
        // Only consider skiable hours: daylight and not dangerously windy
        if (!hourData.is_day) continue;
        const windMph = hourData.wind_speed_80m * 0.621371;
        if (windMph >= 40) continue;

        const snow = classifySnow(forecast, tour, variant, h);
        if (!corn && snow.type === 'corn') corn = { tourIdx: ti, hour: h };
        if (!powder && snow.type === 'powder') powder = { tourIdx: ti, hour: h };
        if (corn && powder) break;
      }
      if (corn && powder) break;
    }
    return { corn, powder };
  }, [weatherQueries]);

  // Per-tour next favorable window for card display
  const tourNextWindows = useMemo(() => {
    const nowMs = Date.now();
    return tours.map((tour, i) => {
      const forecast = weatherQueries[i]?.data as WeatherForecast | undefined;
      if (!forecast) return null;
      const maxFt = metersToFeet(tour.max_elevation_m);
      const minFt = metersToFeet(tour.min_elevation_m);
      // Find closest hour to now (not next hour — current hour may still be favorable)
      let startH = 0;
      let bestDiff = Infinity;
      for (let j = 0; j < forecast.hourly.length; j++) {
        const diff = Math.abs(new Date(forecast.hourly[j].time).getTime() - nowMs);
        if (diff < bestDiff) { bestDiff = diff; startH = j; }
      }
      // Scan for consecutive 'more' daytime hours
      let h = startH;
      while (h < forecast.hourly.length) {
        const hd = forecast.hourly[h];
        if (hd.is_day && assessHour(hd, maxFt, minFt).favorability === 'more') {
          const ws = h;
          while (h < forecast.hourly.length && forecast.hourly[h].is_day &&
                 assessHour(forecast.hourly[h], maxFt, minFt).favorability === 'more') h++;
          return { startTime: forecast.hourly[ws].time, endTime: forecast.hourly[h - 1].time };
        }
        h++;
      }
      return null;
    });
  }, [weatherQueries]);

  // Track which condition shortcut is active (so tapping again resets to "now")
  const [activeCondition, setActiveCondition] = useState<'corn' | 'powder' | null>(null);

  // Snow conditions modal state
  const [snowModalType, setSnowModalType] = useState<SnowType | null>(null);

  const handleGoToCorn = useCallback(() => {
    if (activeCondition === 'corn') {
      // Toggle off — reset to "now"
      setActiveCondition(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.corn) return;
    setActiveCondition('corn');
    setSelectedForecastHour(bestConditions.corn.hour);
  }, [activeCondition, bestConditions.corn, setSelectedForecastHour]);

  const handleGoToPowder = useCallback(() => {
    if (activeCondition === 'powder') {
      // Toggle off — reset to "now"
      setActiveCondition(null);
      setSelectedForecastHour(null);
      return;
    }
    if (!bestConditions.powder) return;
    setActiveCondition('powder');
    setSelectedForecastHour(bestConditions.powder.hour);
  }, [activeCondition, bestConditions.powder, setSelectedForecastHour]);

  // Clear active condition when user manually interacts with the timeline
  // (selectedForecastHour changes to something other than what the condition set)
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
    <>
      {/* Desktop side panel */}
      <aside className="hidden md:flex md:h-full md:w-[400px] md:flex-col md:border-l md:border-gray-200 md:bg-white" aria-label="Tour conditions panel">
        <div className="border-b border-gray-200 px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Skiii</h1>
          <p className="text-xs text-gray-500">Backcountry Tour Guide - Lake Tahoe</p>
        </div>

        <div ref={desktopScrollRef} className="flex-1 overflow-y-auto">
          <div className="transition-opacity duration-150" style={{ opacity: desktopOpacity }}>
            {desktopDisplayedTour ? (
              <div>
                <button
                  onClick={() => selectTour(null)}
                  className="flex items-center gap-1 px-4 py-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  &larr; All tours
                </button>
                <SidebarConditions tour={desktopDisplayedTour} />
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
                    aggregatedFavorability={aggregatedFavorability}
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
                {filteredIndices.flatMap((i, rankIndex) => {
                  const tour = tours[i];
                  const items: React.ReactNode[] = [];
                  // Insert divider when crossing from favorable-today to not-favorable
                  if (rankIndex > 0 && tourFavorableForDay[filteredIndices[rankIndex - 1]] && !tourFavorableForDay[i]) {
                    items.push(
                      <div key="divider" className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{notFavorableLabel}</span>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>
                    );
                  }
                  items.push(
                    <button
                      key={tour.slug}
                      onClick={() => selectTour(tour.slug)}
                      className="w-full text-left"
                      {...(rankIndex === 0 ? { 'data-tour-step': 'tour-list' } : {})}
                    >
                      <TourCard
                        tour={tour}
                        conditions={tourConditions[i]?.conditions}
                        snowType={tourConditions[i]?.snowType}
                        isLoading={tourConditions[i]?.isLoading}
                        rank={rankIndex + 1}
                        nextWindow={tourNextWindows[i]}
                        onSnowTypeClick={setSnowModalType}
                      />
                    </button>
                  );
                  return items;
                })}
              </div>
            )}
          </div>
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
        selectedTourForecast={selectedTourForecast}
        selectedForecastHour={selectedForecastHour}
        onSelectHour={setSelectedForecastHour}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        diffFilter={diffFilter}
        onDiffFilterChange={setDiffFilter}
        totalCount={tours.length}
        hasCorn={!!bestConditions.corn}
        hasPowder={!!bestConditions.powder}
        activeCondition={activeCondition}
        onGoToCorn={handleGoToCorn}
        onGoToPowder={handleGoToPowder}
        aggregatedFavorability={aggregatedFavorability}
        tourNextWindows={tourNextWindows}
        tourFavorableForDay={tourFavorableForDay}
        notFavorableLabel={notFavorableLabel}
        onSnowTypeClick={setSnowModalType}
      />

      <SnowConditionsModal
        open={snowModalType != null}
        activeType={snowModalType}
        onClose={() => setSnowModalType(null)}
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
  selectedTourForecast,
  selectedForecastHour,
  onSelectHour,
  searchQuery,
  onSearchChange,
  diffFilter,
  onDiffFilterChange,
  totalCount,
  hasCorn,
  hasPowder,
  activeCondition,
  onGoToCorn,
  onGoToPowder,
  aggregatedFavorability,
  tourNextWindows,
  tourFavorableForDay,
  notFavorableLabel,
  onSnowTypeClick,
}: {
  selectedTour: ReturnType<typeof tours.find> | null;
  onBack: () => void;
  onSelectTour: (slug: string) => void;
  tourConditions: { conditions?: ConditionsAssessment; snowType?: SnowClassification; isLoading: boolean }[];
  filteredIndices: number[];
  repForecast: WeatherForecast | null;
  repTour: Tour;
  selectedTourForecast: WeatherForecast | null;
  selectedForecastHour: number | null;
  onSelectHour: (hour: number | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  diffFilter: string | null;
  onDiffFilterChange: (d: string | null) => void;
  totalCount: number;
  hasCorn: boolean;
  hasPowder: boolean;
  activeCondition: 'corn' | 'powder' | null;
  onGoToCorn: () => void;
  onGoToPowder: () => void;
  aggregatedFavorability: Favorability[] | null;
  tourNextWindows: ({ startTime: string; endTime: string } | null)[];
  tourFavorableForDay: boolean[];
  notFavorableLabel: string;
  onSnowTypeClick: (type: SnowType) => void;
}) {
  const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('half');
  const startY = useRef(0);
  const startHeightRef = useRef<'collapsed' | 'half' | 'full'>('half');

  // ── Page state (swipe-detected, instant transition) ──
  const [activePage, setActivePage] = useState(selectedTour ? 1 : 0);
  const swipeRef = useRef<{ x0: number; y0: number; locked: 'h' | 'v' | null }>({ x0: 0, y0: 0, locked: null });
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync page when tour selection changes
  useEffect(() => {
    setActivePage(selectedTour ? 1 : 0);
    setSheetHeight('half');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTour]);

  // Swipe detection using native listeners so we can preventDefault on horizontal swipes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      swipeRef.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, locked: null };
    };

    const onMove = (e: TouchEvent) => {
      const s = swipeRef.current;
      if (s.locked === 'v') return; // vertical scroll — don't interfere
      const dx = Math.abs(e.touches[0].clientX - s.x0);
      const dy = Math.abs(e.touches[0].clientY - s.y0);
      if (!s.locked && (dx > 10 || dy > 10)) {
        s.locked = dx > dy ? 'h' : 'v';
      }
      if (s.locked === 'h') {
        e.preventDefault(); // prevent vertical scroll while swiping horizontally
      }
    };

    const onEnd = (e: TouchEvent) => {
      const s = swipeRef.current;
      if (s.locked !== 'h') return;
      const dx = s.x0 - e.changedTouches[0].clientX;
      if (Math.abs(dx) < 50) return;
      if (dx > 0 && activePage === 0 && selectedTour) {
        setActivePage(1);
      } else if (dx < 0 && activePage === 1) {
        setActivePage(0);
        onBack();
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [activePage, selectedTour, onBack]);

  const heightClass = {
    collapsed: 'h-12',
    half: 'h-[30dvh] landscape:h-[20dvh]',
    full: 'h-[60dvh] landscape:h-[40dvh]',
  };

  const showDots = !!selectedTour;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 md:hidden flex flex-col">
      {/* Horizontal layer toggles — always visible on mobile */}
      <MobileLayerToggles showHazardsToggle={!!selectedTour} />

      {/* Content card — horizontal carousel */}
      <div
        className={`mx-2 ${heightClass[sheetHeight]} rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-[height] duration-300 ease-out flex flex-col overflow-hidden`}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center rounded-t-xl bg-white pb-1 pt-2 cursor-grab active:cursor-grabbing shrink-0"
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

        {/* Page content — instant switch, swipe-detected */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto"
        >
          {activePage === 0 ? (
            <div className="flex flex-col gap-2 px-3 pb-3">
              <MobileSearchBar
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                diffFilter={diffFilter}
                onDiffFilterChange={onDiffFilterChange}
                totalCount={totalCount}
                filteredCount={filteredIndices.length}
                hasCorn={hasCorn}
                hasPowder={hasPowder}
                activeCondition={activeCondition}
                onGoToCorn={onGoToCorn}
                onGoToPowder={onGoToPowder}
              />
              {filteredIndices.flatMap((i, rankIndex) => {
                const tour = tours[i];
                const items: React.ReactNode[] = [];
                if (rankIndex > 0 && tourFavorableForDay[filteredIndices[rankIndex - 1]] && !tourFavorableForDay[i]) {
                  items.push(
                    <div key="divider" className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{notFavorableLabel}</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  );
                }
                items.push(
                  <button
                    key={tour.slug}
                    onClick={() => onSelectTour(tour.slug)}
                    className="w-full text-left"
                    {...(rankIndex === 0 ? { 'data-tour-step': 'tour-list-mobile' } : {})}
                  >
                    <TourCard
                      tour={tour}
                      conditions={tourConditions[i]?.conditions}
                      snowType={tourConditions[i]?.snowType}
                      isLoading={tourConditions[i]?.isLoading}
                      rank={rankIndex + 1}
                      nextWindow={tourNextWindows[i]}
                      onSnowTypeClick={onSnowTypeClick}
                    />
                  </button>
                );
                return items;
              })}
            </div>
          ) : selectedTour ? (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1 px-3 pt-2 pb-1 text-[12px] font-medium text-blue-600 active:text-blue-800"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                All Tours
              </button>
              <SidebarConditions tour={selectedTour} hideTimeline />
            </>
          ) : null}
        </div>
      </div>

      {/* Carousel dots — appear when a route is selected */}
      <div className={`flex justify-center gap-1.5 transition-all duration-200 ${showDots ? 'py-1.5 opacity-100' : 'h-0 overflow-hidden opacity-0'}`}>
        {[0, 1].map((page) => (
          <div
            key={page}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              activePage === page ? 'w-4 bg-gray-600' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Spacer between card and timeline — consistent mb whether dots visible or not */}
      <div className={`transition-all duration-200 ${showDots ? 'h-0' : 'h-2'}`} />

      {/* Timeline footer — always visible, sticky at bottom */}
      {(() => {
        const timelineForecast = (selectedTour ? selectedTourForecast : null) ?? repForecast;
        const timelineTour = selectedTour ?? repTour;
        return (
          <div className="mx-2 mb-2 rounded-xl bg-white shadow-lg ring-1 ring-gray-200" data-tour-step="timeline-mobile">
            {timelineForecast ? (
              <div className="px-1 py-2">
                <OverviewTimeline
                  forecast={timelineForecast}
                  tour={timelineTour}
                  selectedHour={selectedForecastHour}
                  onSelectHour={onSelectHour}
                  aggregatedFavorability={selectedTour ? null : aggregatedFavorability}
                />
              </div>
            ) : (
              <div className="mx-3 my-2 h-12 animate-pulse rounded-lg bg-gray-100" />
            )}
          </div>
        );
      })()}
    </div>
  );
}

/** Horizontal scrollable layer toggles shown above the content card on mobile.
 *  Ordered by importance: safety layers first, then weather, then terrain context.
 *  Hazards toggle only shown when a tour is selected. */
function MobileLayerToggles({ showHazardsToggle }: { showHazardsToggle: boolean }) {
  const {
    showSlopeAngle, showAvyZones, showHazards, show3DTerrain,
    showWind, showPrecip, showAspect, showSunExposure, showTreeCover,
    toggleSlopeAngle, toggleAvyZones, toggleHazards, toggle3DTerrain,
    toggleWind, togglePrecip, toggleAspect, toggleSunExposure, toggleTreeCover,
  } = useMapStore(useShallow((s) => ({
    showSlopeAngle: s.showSlopeAngle, toggleSlopeAngle: s.toggleSlopeAngle,
    showAvyZones: s.showAvyZones, toggleAvyZones: s.toggleAvyZones,
    showHazards: s.showHazards, toggleHazards: s.toggleHazards,
    show3DTerrain: s.show3DTerrain, toggle3DTerrain: s.toggle3DTerrain,
    showWind: s.showWind, toggleWind: s.toggleWind,
    showPrecip: s.showPrecip, togglePrecip: s.togglePrecip,
    showAspect: s.showAspect, toggleAspect: s.toggleAspect,
    showSunExposure: s.showSunExposure, toggleSunExposure: s.toggleSunExposure,
    showTreeCover: s.showTreeCover, toggleTreeCover: s.toggleTreeCover,
  })));

  const layers = [
    { label: 'Slope Angle', icon: '\u2220', active: showSlopeAngle, toggle: toggleSlopeAngle },
    ...(showHazardsToggle ? [{ label: 'Hazards', icon: '\u26A0', active: showHazards, toggle: toggleHazards }] : []),
    { label: '3D Terrain', icon: '\u26F0', active: show3DTerrain, toggle: toggle3DTerrain },
    { label: 'Wind', icon: '\uD83C\uDF2C', active: showWind, toggle: toggleWind },
    { label: 'Precip', icon: '\u2744', active: showPrecip, toggle: togglePrecip },
    { label: 'Aspect', icon: '\uD83E\uDDED', active: showAspect, toggle: toggleAspect },
    { label: 'Sun', icon: '\u2600', active: showSunExposure, toggle: toggleSunExposure },
    { label: 'Trees', icon: '\uD83C\uDF32', active: showTreeCover, toggle: toggleTreeCover },
    { label: 'Avy Zones', icon: '\u26A0', active: showAvyZones, toggle: toggleAvyZones },
  ];

  return (
    <div
      className="mx-2 mb-2 flex gap-1.5 overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {layers.map(({ label, icon, active, toggle }) => (
        <button
          key={label}
          onClick={toggle}
          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-colors ${
            active
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-gray-200'
          }`}
        >
          <span className="text-xs">{icon}</span>
          {label}
        </button>
      ))}
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
        {AVAILABLE_DIFFICULTIES.map((d) => (
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

/** Mobile-only: search hidden behind an icon, difficulty pills + count always visible. */
function MobileSearchBar({
  searchQuery,
  onSearchChange,
  diffFilter,
  onDiffFilterChange,
  totalCount,
  filteredCount,
  hasCorn,
  hasPowder,
  activeCondition,
  onGoToCorn,
  onGoToPowder,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  diffFilter: string | null;
  onDiffFilterChange: (d: string | null) => void;
  totalCount: number;
  filteredCount: number;
  hasCorn: boolean;
  hasPowder: boolean;
  activeCondition: 'corn' | 'powder' | null;
  onGoToCorn: () => void;
  onGoToPowder: () => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="mb-1 space-y-2">
      {/* Single row: scrollable difficulty pills + search icon on right */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {AVAILABLE_DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => onDiffFilterChange(diffFilter === d ? null : d)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${
                diffFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              aria-label={`Filter by ${d}`}
              aria-pressed={diffFilter === d}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
          {hasPowder && (
            <button
              onClick={onGoToPowder}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${
                activeCondition === 'powder'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {'\u2744'} Powder
            </button>
          )}
          {hasCorn && (
            <button
              onClick={onGoToCorn}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap ${
                activeCondition === 'corn'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {'\uD83C\uDF3D'} Corn
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setOpen((v) => !v);
            if (open) onSearchChange('');
          }}
          className={`shrink-0 rounded-lg p-1.5 ${open ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
          aria-label={open ? 'Close search' : 'Search tours'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.58 3.58a.75.75 0 1 1-1.06 1.06l-3.58-3.58A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Expandable search input */}
      {open && (
        <input
          ref={inputRef}
          type="search"
          placeholder="Search tours..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs placeholder:text-gray-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none"
          aria-label="Search tours by name"
        />
      )}
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
