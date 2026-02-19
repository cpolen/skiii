'use client';

import { useMemo, useState } from 'react';
import type { WeatherForecast } from '@/lib/types/conditions';
import { metersToFeet } from '@/lib/types/conditions';
import type { Tour } from '@/lib/types/tour';
import { assessHour } from '@/lib/analysis/timing';

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

interface OverviewTimelineProps {
  forecast: WeatherForecast;
  tour: Tour;
  selectedHour: number | null;
  onSelectHour: (hour: number | null) => void;
}

export function OverviewTimeline({ forecast, tour, selectedHour, onSelectHour }: OverviewTimelineProps) {
  const maxFt = metersToFeet(tour.max_elevation_m);
  const minFt = metersToFeet(tour.min_elevation_m);

  const hours = useMemo(() => {
    return forecast.hourly.map((h, i) => {
      const { favorability } = assessHour(h, maxFt, minFt);
      return {
        index: i,
        favorability,
        isDay: h.is_day,
        time: h.time,
      };
    });
  }, [forecast.hourly, maxFt, minFt]);

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

  // Mobile day tab state
  const [activeDay, setActiveDay] = useState(0);

  // Selected hour time label
  const selectedLabel = selectedHour != null && hours[selectedHour]
    ? `${getDayLabel(hours[selectedHour].time)} ${formatHourLabel(hours[selectedHour].time)}`
    : null;

  // Best consecutive favorable daytime window
  const bestWindow = useMemo(() => {
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;
    for (let i = 0; i < hours.length; i++) {
      if (hours[i].isDay && hours[i].favorability === 'more') {
        if (curStart === -1) curStart = i;
        curLen++;
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else {
        curStart = -1; curLen = 0;
      }
    }
    if (bestStart === -1 || bestLen < 2) return null;
    const startLabel = `${getDayLabel(hours[bestStart].time)} ${formatHourLabel(hours[bestStart].time)}`;
    const endLabel = formatHourLabel(hours[bestStart + bestLen - 1].time);
    return `${startLabel} – ${endLabel} (${bestLen}h)`;
  }, [hours]);

  return (
    <div className="mb-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
      {/* Header */}
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          72-Hour Conditions
        </p>
      </div>

      {/* Day tabs for mobile */}
      <div className="flex gap-1 mb-2 md:hidden">
        {dayLabels.map((dl, idx) => (
          <button
            key={dl.index}
            onClick={() => setActiveDay(idx)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${
              activeDay === idx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
            aria-label={`Show ${dl.label} forecast`}
          >
            {dl.label}
          </button>
        ))}
      </div>

      {/* Full 72-bar view for desktop */}
      <div className="hidden md:flex gap-px">
        {hours.map((h) => {
          const isPast = h.index < nowIndex;
          const color = isPast ? '#6B7280' : h.isDay ? FAV_COLORS[h.favorability] : FAV_COLORS.night;
          const isSelected = selectedHour === h.index;
          const isNow = h.index === nowIndex;

          return (
            <button
              key={h.index}
              onClick={() => onSelectHour(h.index)}
              className="relative flex-1 transition-transform hover:scale-y-110"
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

      {/* Day-segmented view for mobile — wider bars per day */}
      <div className="flex gap-px md:hidden">
        {hours
          .filter((_, i) => {
            const dayStart = dayLabels[activeDay]?.index ?? 0;
            const dayEnd = dayLabels[activeDay + 1]?.index ?? hours.length;
            return i >= dayStart && i < dayEnd;
          })
          .map((h) => {
            const isPast = h.index < nowIndex;
            const color = isPast ? '#6B7280' : h.isDay ? FAV_COLORS[h.favorability] : FAV_COLORS.night;
            const isSelected = selectedHour === h.index;
            const isNow = h.index === nowIndex;

            return (
              <button
                key={h.index}
                onClick={() => onSelectHour(h.index)}
                className="relative flex-1 transition-transform hover:scale-y-110"
                style={{ height: 32 }}
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

      {/* Day labels — desktop only */}
      <div className="relative mt-1 h-3 hidden md:block">
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

      {/* Best window summary — shown when no hour is selected */}
      {!selectedLabel && bestWindow && (
        <p className="mt-1.5 text-[11px] text-green-700">
          Best window: {bestWindow}
        </p>
      )}
    </div>
  );
}
