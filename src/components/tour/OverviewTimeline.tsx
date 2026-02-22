'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { WeatherForecast } from '@/lib/types/conditions';
import { metersToFeet, celsiusToFahrenheit, kmhToMph } from '@/lib/types/conditions';
import type { Tour } from '@/lib/types/tour';
import { assessHour } from '@/lib/analysis/timing';
import type { Favorability } from '@/lib/analysis/timing';

const FAV_COLORS = {
  more: '#16A34A',
  caution: '#EAB308',
  less: '#9CA3AF',
  night: '#4B5563',
} as const;

function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now.getTime() + 86400000);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Width of each hour cell in the mobile scrollable timeline (px).
 *  ~15px fits a full 24-hour day on a typical phone screen (~375px). */
const CELL_W = 15;
/** Gap between cells (matches `gap-px` = 1px). */
const CELL_GAP = 1;
/** Total stride per cell (width + gap) for scroll position math. */
const CELL_STRIDE = CELL_W + CELL_GAP;

interface OverviewTimelineProps {
  forecast: WeatherForecast;
  tour: Tour;
  selectedHour: number | null;
  onSelectHour: (hour: number | null) => void;
  aggregatedFavorability?: Favorability[] | null;
}

export function OverviewTimeline({ forecast, tour, selectedHour, onSelectHour, aggregatedFavorability }: OverviewTimelineProps) {
  const maxFt = metersToFeet(tour.max_elevation_m);
  const minFt = metersToFeet(tour.min_elevation_m);

  const hours = useMemo(() => {
    return forecast.hourly.map((h, i) => {
      const favorability = aggregatedFavorability?.[i] ?? assessHour(h, maxFt, minFt).favorability;
      return {
        index: i,
        favorability,
        isDay: h.is_day,
        time: h.time,
      };
    });
  }, [forecast.hourly, maxFt, minFt, aggregatedFavorability]);

  // Find "now" index — closest hour to current time
  const nowIndex = useMemo(() => {
    const now = Date.now();
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < hours.length; i++) {
      const diff = Math.abs(new Date(hours[i].time).getTime() - now);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }, [hours]);

  // Day boundary labels: find first hour of each new day
  const dayLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    let lastDate = '';
    for (let i = 0; i < hours.length; i++) {
      const d = new Date(hours[i].time).toDateString();
      if (d !== lastDate) {
        lastDate = d;
        labels.push({ index: i, label: getDayLabel(hours[i].time) });
      }
    }
    return labels;
  }, [hours]);

  // Selected hour time label
  const selectedLabel = selectedHour != null && hours[selectedHour]
    ? `${getDayLabel(hours[selectedHour].time)} ${formatHourLabel(hours[selectedHour].time)}`
    : null;

  // Next favorable daytime window at or after now
  const nextWindow = useMemo(() => {
    let i = nowIndex;
    while (i < hours.length) {
      if (hours[i].isDay && hours[i].favorability === 'more') {
        const start = i;
        while (i < hours.length && hours[i].isDay && hours[i].favorability === 'more') i++;
        const len = i - start;
        if (len >= 2) {
          const startLabel = `${getDayLabel(hours[start].time)} ${formatHourLabel(hours[start].time)}`;
          const endLabel = formatHourLabel(hours[start + len - 1].time);
          return { label: `${startLabel} – ${endLabel}`, startIndex: start };
        }
      } else {
        i++;
      }
    }
    return null;
  }, [hours, nowIndex]);

  // --- Mobile scrollable timeline state ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIndex, setCenterIndex] = useState(nowIndex);
  const [committed, setCommitted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipCommitRef = useRef(false);

  // On mount, scroll to the selected hour (if any) or "now".
  // The leading spacer is (50% - CELL_W/2), so scrollLeft = index * CELL_STRIDE centers that cell.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Skip the commit that this programmatic scroll would trigger —
    // we don't want to change selectedForecastHour from null on mount,
    // because that would cancel the in-flight "now" grid data fetch.
    skipCommitRef.current = true;
    const target = selectedHour != null ? selectedHour : nowIndex;
    // Use rAF to ensure children are laid out before setting scroll position
    requestAnimationFrame(() => {
      el.scrollLeft = target * CELL_STRIDE;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the last hour the timeline itself committed, so we can distinguish
  // external selectedHour changes from our own commits.
  const lastCommittedHourRef = useRef<number | null>(selectedHour);

  // When selectedHour changes externally (e.g. Corn/Powder pill), scroll to it.
  useEffect(() => {
    if (selectedHour === lastCommittedHourRef.current) return;
    lastCommittedHourRef.current = selectedHour;
    const el = scrollRef.current;
    if (!el) return;
    const target = selectedHour != null ? selectedHour : nowIndex;
    skipCommitRef.current = true;
    el.scrollTo({ left: target * CELL_STRIDE, behavior: 'smooth' });
    setCenterIndex(target);
    setCommitted(true);
    setTimeout(() => setCommitted(false), 300);
  }, [selectedHour, nowIndex]);

  // Keep a ref to onSelectHour so callbacks always call the latest version
  const onSelectHourRef = useRef(onSelectHour);
  onSelectHourRef.current = onSelectHour;

  // Commit: snap to nearest cell, update Zustand store, trigger pulse
  const commitSelection = useCallback(() => {
    if (skipCommitRef.current) { skipCommitRef.current = false; return; }
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.round(el.scrollLeft / CELL_STRIDE)));
    el.scrollLeft = idx * CELL_STRIDE; // snap to exact cell boundary
    setCenterIndex(idx);
    lastCommittedHourRef.current = idx;
    onSelectHourRef.current(idx);
    setCommitted(true);
    setTimeout(() => setCommitted(false), 300);
  }, [hours.length]);

  // Scroll handler: update label immediately, schedule commit via debounce fallback
  const onTimelineScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.round(el.scrollLeft / CELL_STRIDE)));
    setCenterIndex(idx);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(commitSelection, 350);
  };

  // scrollend listener: authoritative commit when the browser confirms scroll finished.
  // React has no onScrollEnd prop, so we use addEventListener directly.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScrollEnd = () => {
      // Cancel pending debounce — scrollend is authoritative
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      commitSelection();
    };
    el.addEventListener('scrollend', handleScrollEnd);
    return () => el.removeEventListener('scrollend', handleScrollEnd);
  }, [commitSelection]);

  // The prominent label shown above the scrollable strip
  const centerHour = hours[centerIndex];
  const centerLabel = centerHour
    ? `${getDayLabel(centerHour.time)}, ${formatHourLabel(centerHour.time)}`
    : '';

  return (
    <div className="md:mb-2 md:rounded-xl md:bg-white md:p-3 md:shadow-sm md:ring-1 md:ring-gray-100">
      {/* ===== MOBILE: scrollable timeline ===== */}
      <div className="md:hidden">
        {/* Status row: next window link (right-aligned) */}
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{centerLabel}</p>
          {nextWindow ? (
            <button
              onClick={() => {
                onSelectHour(nextWindow.startIndex);
                setCenterIndex(nextWindow.startIndex);
                const el = scrollRef.current;
                if (el) el.scrollTo({ left: nextWindow.startIndex * CELL_STRIDE, behavior: 'smooth' });
              }}
              className="text-[11px] text-green-700"
            >
              Next window: <span className="font-medium underline">{nextWindow.label}</span>
            </button>
          ) : null}
        </div>

        {/* Scrollable bar strip with center indicator */}
        <div className="relative timeline-fade">
          {/* Center indicator with triangles */}
          <div className={`pointer-events-none absolute -top-2 -bottom-2 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center transition-opacity duration-300 ${committed ? 'opacity-100' : 'opacity-80'}`}>
            <div className="text-[10px] leading-none text-red-500">&#9660;</div>
            <div className="flex-1 w-[2px] bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
            <div className="text-[10px] leading-none text-red-500">&#9650;</div>
          </div>

          <div
            ref={scrollRef}
            onScroll={onTimelineScroll}
            className="flex gap-px overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
          >
            {/* Leading spacer so the first cell can be centered.
               Accounts for the 1px flex gap between spacer and cell 0. */}
            <div className="shrink-0" style={{ width: `calc(50% - ${CELL_W / 2 + CELL_GAP}px)` }} />

            {hours.map((h) => {
              const isPast = h.index < nowIndex;
              const color = isPast ? '#6B7280' : h.isDay ? FAV_COLORS[h.favorability] : FAV_COLORS.night;
              const isSelected = selectedHour === h.index;
              const isNow = h.index === nowIndex;

              return (
                <button
                  key={h.index}
                  onClick={() => {
                    if (isPast) return;
                    onSelectHour(h.index);
                    setCenterIndex(h.index);
                    const el = scrollRef.current;
                    if (el) el.scrollTo({ left: h.index * CELL_STRIDE, behavior: 'smooth' });
                  }}
                  className={`relative shrink-0 ${isPast ? 'cursor-default' : ''}`}
                  style={{ width: CELL_W, height: 28 }}
                  aria-label={`Select ${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
                >
                  <div
                    className={`h-full rounded-[2px] ${
                      isSelected ? 'ring-1.5 ring-blue-500' : ''
                    }`}
                    style={{
                      backgroundColor: color,
                      opacity: isSelected ? 1 : isPast ? 0.4 : 0.65,
                    }}
                  />
                  {isNow && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] leading-none text-red-500">
                      ▼
                    </div>
                  )}
                </button>
              );
            })}

            {/* Trailing spacer so the last cell can be centered */}
            <div className="shrink-0" style={{ width: `calc(50% - ${CELL_W / 2 + CELL_GAP}px)` }} />
          </div>
        </div>

        {/* Below strip: Reset (left) + legend (center) + weather (right) */}
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-gray-500">
          {selectedHour != null ? (
            <button
              onClick={() => {
                skipCommitRef.current = true;
                if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
                onSelectHour(null);
                const el = scrollRef.current;
                if (el) el.scrollLeft = nowIndex * CELL_STRIDE;
              }}
              className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-blue-500"
              aria-label="Show current conditions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5H8.75V3.75Z" clipRule="evenodd" />
              </svg>
              Reset
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: FAV_COLORS.more }} />
              Favorable
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: FAV_COLORS.caution }} />
              Caution
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: FAV_COLORS.less }} />
              Less ideal
            </span>
          </div>
          {(() => {
            const h = forecast.hourly[centerIndex];
            if (!h) return null;
            const tempF = Math.round(celsiusToFahrenheit(h.temperature_2m));
            const windMph = Math.round(kmhToMph(h.wind_speed_80m));
            return (
              <span className="text-[10px] text-gray-600">
                {tempF}°F · {windMph}mph
              </span>
            );
          })()}
        </div>
      </div>

      {/* ===== DESKTOP: unchanged 72-bar view ===== */}
      <div className="hidden md:block" data-tour-step="timeline">
        <div className="mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            72-Hour Conditions
          </p>
        </div>

        <div className="flex gap-px">
          {hours.map((h) => {
            const isPast = h.index < nowIndex;
            const color = isPast ? '#6B7280' : h.isDay ? FAV_COLORS[h.favorability] : FAV_COLORS.night;
            const isSelected = selectedHour === h.index;
            const isNow = h.index === nowIndex;

            return (
              <button
                key={h.index}
                onClick={() => { if (!isPast) onSelectHour(h.index); }}
                className={`relative flex-1 transition-transform ${isPast ? 'cursor-default' : 'hover:scale-y-110'}`}
                style={{ height: 24 }}
                aria-label={`Select ${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
                title={`${getDayLabel(h.time)} ${formatHourLabel(h.time)}`}
              >
                <div
                  className={`h-full w-full rounded-[1px] transition-all duration-150 ${
                    isSelected ? 'scale-y-125 ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: color,
                    opacity: isSelected ? 1 : isPast ? 0.5 : 0.6,
                  }}
                />
                {isNow && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] leading-none text-red-500">
                    ▼
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Day labels */}
        <div className="relative mt-1 h-3">
          {dayLabels.map((dl) => (
            <span
              key={dl.index}
              className="absolute text-[9px] text-gray-400"
              style={{ left: `${(dl.index / hours.length) * 100}%` }}
            >
              {dl.label}
            </span>
          ))}
        </div>

        {/* Selection label with Reset */}
        {selectedLabel && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-blue-700">
              Showing conditions for {selectedLabel}
            </span>
            <button
              onClick={() => onSelectHour(null)}
              className="text-[10px] font-medium text-blue-500 hover:text-blue-700"
              aria-label="Reset to current time"
            >
              Reset
            </button>
          </div>
        )}

        {/* Next window summary — shown when no hour is selected */}
        {!selectedLabel && nextWindow && (
          <p className="mt-1.5 text-[11px] text-green-700">
            Next window: {nextWindow.label}
          </p>
        )}
      </div>
    </div>
  );
}
