'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import type { Tour } from '@/lib/types/tour';
import { useWeather } from '@/hooks/useWeather';
import {
  celsiusToFahrenheit,
  kmhToMph,
  metersToFeet,
  windDegreesToCompass,
} from '@/lib/types/conditions';
import { analyzeTiming } from '@/lib/analysis/timing';
import { useMapStore } from '@/stores/map';

interface TimelinePoint {
  time: string;
  hour: number; // index
  label: string; // display label e.g. "6 AM"
  dayLabel: string; // "Today", "Tomorrow", "Day 3"
  windMph: number;
  ridgeWindMph: number;
  windDir: string;
  precipIn: number;
  snowIn: number;
  isSnow: boolean; // based on freezing level vs tour elevation
  freezingFt: number;
  tempF: number;
  isDay: boolean;
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Advance an ISO time string by 1 hour (for displaying inclusive window end times). */
function advanceOneHour(iso: string): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

function getDayLabel(iso: string, nowDate: Date): string {
  const d = new Date(iso);
  const today = nowDate.toDateString();
  const tomorrow = new Date(nowDate.getTime() + 86400000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function ConditionsTimeline({ tour, compact, overlay }: { tour: Tour; compact?: boolean; overlay?: boolean }) {
  const { data: forecast, isLoading, error } = useWeather(tour);
  const selectedHour = useMapStore((s) => s.selectedForecastHour);
  const setSelectedHour = useMapStore((s) => s.setSelectedForecastHour);

  const { points, nowIndex, tourMinFt, tourMaxFt, timingWindows } = useMemo(() => {
    if (!forecast) return { points: [], nowIndex: 0, tourMinFt: 0, tourMaxFt: 0, timingWindows: [] };

    const now = new Date();
    const minFt = metersToFeet(tour.min_elevation_m);
    const maxFt = metersToFeet(tour.max_elevation_m);
    let closestIdx = 0;
    let minDiff = Infinity;

    const pts: TimelinePoint[] = forecast.hourly.map((h, i) => {
      const diff = Math.abs(new Date(h.time).getTime() - now.getTime());
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }

      const freezingFt = metersToFeet(h.freezing_level_height);
      return {
        time: h.time,
        hour: i,
        label: formatHourLabel(h.time),
        dayLabel: getDayLabel(h.time, now),
        windMph: kmhToMph(h.wind_speed_10m),
        ridgeWindMph: kmhToMph(h.wind_speed_80m),
        windDir: windDegreesToCompass(h.wind_direction_10m),
        precipIn: Math.round((h.precipitation / 25.4) * 100) / 100,
        snowIn: Math.round((h.snowfall / 2.54) * 100) / 100,
        isSnow: freezingFt < minFt,
        freezingFt,
        tempF: Math.round(celsiusToFahrenheit(h.temperature_2m)),
        isDay: h.is_day,
      };
    });

    const timing = analyzeTiming(forecast, tour);

    return { points: pts, nowIndex: closestIdx, tourMinFt: minFt, tourMaxFt: maxFt, timingWindows: timing.windows };
  }, [forecast, tour]);

  // Tour duration for selection band width
  const tourDurationHours = Math.round(
    (tour.estimated_hours_range[0] + tour.estimated_hours_range[1]) / 2,
  );
  const selectionStart = selectedHour != null ? selectedHour : null;
  const selectionEnd =
    selectedHour != null
      ? Math.min(selectedHour + tourDurationHours - 1, points.length - 1)
      : null;

  // Chart click handler — select a forecast hour
  const handleChartClick = (e: { activeLabel?: string | number } | null) => {
    if (e?.activeLabel != null) setSelectedHour(Number(e.activeLabel));
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          72-Hour Forecast
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="ml-2 text-xs text-gray-500">Loading forecast...</span>
        </div>
      </div>
    );
  }

  if (error || !forecast || points.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          72-Hour Forecast
        </h2>
        <p className="text-xs text-red-500">Unable to load forecast data</p>
      </div>
    );
  }

  // Day boundary lines
  const dayBoundaries: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i].dayLabel !== points[i - 1].dayLabel) {
      dayBoundaries.push(i);
    }
  }

  // Favorable windows for reference areas
  const favorableAreas = timingWindows
    .filter((w) => w.favorability === 'more')
    .map((w) => ({ start: w.startHour, end: w.endHour }));

  // Caution (mixed) windows for reference areas
  const cautionAreas = timingWindows
    .filter((w) => w.favorability === 'caution')
    .map((w) => ({ start: w.startHour, end: w.endHour }));

  // Nighttime ranges — contiguous runs where isDay is false
  const nightAreas: { start: number; end: number }[] = [];
  {
    let nightStart: number | null = null;
    for (let i = 0; i < points.length; i++) {
      if (!points[i].isDay) {
        if (nightStart === null) nightStart = i;
      } else {
        if (nightStart !== null) {
          nightAreas.push({ start: nightStart, end: i - 1 });
          nightStart = null;
        }
      }
    }
    if (nightStart !== null) nightAreas.push({ start: nightStart, end: points.length - 1 });
  }

  // ── Overlay mode: single merged chart ──────────────────────────────────
  if (overlay) {
    return (
      <div>
        {/* Selection indicator */}
        {selectedHour != null && selectionStart != null && selectionEnd != null && points.length > 0 && (
          <div className="mx-3 mb-1 flex items-center justify-between rounded-md bg-blue-50 px-2.5 py-1">
            <span className="text-[11px] font-medium text-blue-800">
              {points[selectionStart]?.dayLabel} {points[selectionStart]?.label} –{' '}
              {(() => {
                const endIso = points[selectionEnd]?.time;
                if (!endIso) return '';
                const endDisplayIso = advanceOneHour(endIso);
                const now = new Date();
                const endDay = getDayLabel(endDisplayIso, now);
                const startDay = points[selectionStart]?.dayLabel;
                return `${endDay !== startDay ? `${endDay} ` : ''}${formatHourLabel(endDisplayIso)}`;
              })()}
              <span className="ml-1 text-blue-600">({tourDurationHours}h window)</span>
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="ml-2 shrink-0 text-[11px] font-medium text-blue-600 hover:text-blue-800"
            >
              ✕ Reset
            </button>
          </div>
        )}
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart
            data={points}
            margin={{ top: 4, right: 8, bottom: 2, left: 0 }}
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            {nowIndex > 0 && (
              <ReferenceArea yAxisId="left" x1={0} x2={nowIndex} fill="#374151" fillOpacity={0.3} />
            )}
            {nightAreas.map((a, i) => (
              <ReferenceArea key={`night-${i}`} yAxisId="left" x1={a.start} x2={a.end} fill="#1f2937" fillOpacity={0.06} />
            ))}
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => points[v]?.label ?? ''}
              interval={6}
            />
            <YAxis yAxisId="left" width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" width={36} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}\u2033`} />
            <Tooltip content={<OverlayTooltip />} />
            <ReferenceLine yAxisId="left" x={nowIndex} stroke="#EF4444" strokeWidth={2} label={{ value: '▼ Now', position: 'top', fontSize: 10, fill: '#EF4444', fontWeight: 600 }} />
            {cautionAreas.map((a, i) => (
              <ReferenceArea key={`caut-${i}`} yAxisId="left" x1={a.start} x2={a.end} fill="#EAB308" fillOpacity={0.25} />
            ))}
            {favorableAreas.map((a, i) => (
              <ReferenceArea key={`fav-${i}`} yAxisId="left" x1={a.start} x2={a.end} fill="#16A34A" fillOpacity={0.25} />
            ))}
            {dayBoundaries.map((b) => (
              <ReferenceLine key={b} yAxisId="left" x={b} stroke="#E5E7EB" />
            ))}
            {/* Selection band before data so lines draw on top */}
            {selectionStart != null && selectionEnd != null && (
              <ReferenceArea yAxisId="left" x1={selectionStart} x2={selectionEnd} fill="#3B82F6" fillOpacity={0.2} stroke="#2563EB" strokeWidth={1.5} ifOverflow="extendDomain" />
            )}
            <Bar yAxisId="right" dataKey="precipIn" fill="#93C5FD" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="windMph" stroke="#3B82F6" strokeWidth={1.5} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="ridgeWindMph" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="tempF" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const wrapperClass = compact
    ? 'p-3'
    : 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100';

  const windPrecipH = compact ? 120 : 150;
  const tempFreezeH = compact ? 120 : 150;
  const yW = compact ? 28 : 36;
  const yRightW = compact ? 36 : 46;
  const syncId = compact ? 'conditions-compact' : 'conditions';

  // Shared X-axis tick config: show every 6th hour label
  const xTickStyle = { fontSize: compact ? 9 : 10, fill: '#9CA3AF' };
  const xTickFormatter = (v: number) => points[v]?.label ?? '';
  const xTickInterval = compact ? 8 : 6;

  return (
    <div className={wrapperClass}>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        72-Hour Forecast
      </h2>

      {/* Selection indicator */}
      {selectedHour != null && selectionStart != null && selectionEnd != null && points.length > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5">
          <span className="text-[11px] font-medium text-blue-800">
            Map showing: {points[selectionStart]?.dayLabel} {points[selectionStart]?.label} –{' '}
            {(() => {
              const endIso = points[selectionEnd]?.time;
              if (!endIso) return '';
              const endDisplayIso = advanceOneHour(endIso);
              const now = new Date();
              const endDay = getDayLabel(endDisplayIso, now);
              const startDay = points[selectionStart]?.dayLabel;
              return `${endDay !== startDay ? `${endDay} ` : ''}${formatHourLabel(endDisplayIso)}`;
            })()}
            <span className="ml-1 text-blue-600">({tourDurationHours}h tour window)</span>
          </span>
          <button
            onClick={() => setSelectedHour(null)}
            className="ml-2 shrink-0 text-[11px] font-medium text-blue-600 hover:text-blue-800"
          >
            ✕ Current
          </button>
        </div>
      )}

      {/* Timing legend */}
      <div className="mb-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-gray-300" /> Past
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-green-100" /> Favorable
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-yellow-100" /> Mixed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded-sm border border-blue-400 bg-blue-100" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded-sm bg-gray-200" /> Night
        </span>
        <span className="text-[9px] italic text-gray-500">Click chart to select time window</span>
      </div>

      {/* Wind & Precipitation Track */}
      <TrackLabel label="Wind & Precipitation" sublabel="Blue/Red lines = wind (mph) · Bars = precip (in/hr)" />
      <ResponsiveContainer width="100%" height={windPrecipH}>
        <ComposedChart data={points} syncId={syncId} margin={{ top: 4, right: 8, bottom: 2, left: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          {nowIndex > 0 && (
            <ReferenceArea x1={0} x2={nowIndex} fill="#374151" fillOpacity={0.3} />
          )}
          {nightAreas.map((a, i) => (
            <ReferenceArea key={`night-${i}`} x1={a.start} x2={a.end} fill="#1f2937" fillOpacity={0.06} />
          ))}
          <XAxis
            dataKey="hour"
            tick={xTickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
            interval={xTickInterval}
          />
          <YAxis yAxisId="left" width={yW} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" width={yRightW} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}\u2033`} />
          <Tooltip content={<WindPrecipTooltip />} />
          <ReferenceLine x={nowIndex} stroke="#9CA3AF" strokeDasharray="4 2" />
          {cautionAreas.map((a, i) => (
            <ReferenceArea key={`caut-${i}`} x1={a.start} x2={a.end} fill="#EAB308" fillOpacity={0.25} />
          ))}
          {favorableAreas.map((a, i) => (
            <ReferenceArea key={`fav-${i}`} x1={a.start} x2={a.end} fill="#16A34A" fillOpacity={0.25} />
          ))}
          {selectionStart != null && selectionEnd != null && (
            <ReferenceArea x1={selectionStart} x2={selectionEnd} fill="#3B82F6" fillOpacity={0.15} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 2" />
          )}
          {dayBoundaries.map((b) => (
            <ReferenceLine key={b} x={b} stroke="#E5E7EB" />
          ))}
          <Bar yAxisId="right" dataKey="precipIn" fill="#93C5FD" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="windMph"
            stroke="#3B82F6"
            strokeWidth={1.5}
            dot={false}
            name="Surface"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ridgeWindMph"
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="Ridge"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Temperature & Freezing Level Track */}
      <TrackLabel label="Temperature & Freezing Level" sublabel={`Orange = temp (\u00B0F) · Purple = freezing level · Tour: ${tourMinFt.toLocaleString()}\u2019\u2013${tourMaxFt.toLocaleString()}\u2019`} />
      <ResponsiveContainer width="100%" height={tempFreezeH}>
        <ComposedChart data={points} syncId={syncId} margin={{ top: 4, right: 8, bottom: 2, left: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          {nowIndex > 0 && (
            <ReferenceArea x1={0} x2={nowIndex} fill="#374151" fillOpacity={0.3} />
          )}
          {nightAreas.map((a, i) => (
            <ReferenceArea key={`night-${i}`} x1={a.start} x2={a.end} fill="#1f2937" fillOpacity={0.06} />
          ))}
          <XAxis
            dataKey="hour"
            tick={xTickStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
            interval={xTickInterval}
          />
          <YAxis yAxisId="left" width={yW} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}\u00B0`} />
          <YAxis yAxisId="right" orientation="right" width={yRightW} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} />
          <Tooltip content={<TempFreezeTooltip />} />
          <ReferenceLine x={nowIndex} stroke="#9CA3AF" strokeDasharray="4 2" />
          <ReferenceArea yAxisId="right" y1={tourMinFt} y2={tourMaxFt} fill="#DBEAFE" fillOpacity={0.4} />
          <ReferenceLine yAxisId="left" y={32} stroke="#93C5FD" strokeDasharray="3 3" />
          {cautionAreas.map((a, i) => (
            <ReferenceArea key={`caut-${i}`} x1={a.start} x2={a.end} fill="#EAB308" fillOpacity={0.25} />
          ))}
          {favorableAreas.map((a, i) => (
            <ReferenceArea key={`fav-${i}`} x1={a.start} x2={a.end} fill="#16A34A" fillOpacity={0.25} />
          ))}
          {selectionStart != null && selectionEnd != null && (
            <ReferenceArea x1={selectionStart} x2={selectionEnd} fill="#3B82F6" fillOpacity={0.15} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 2" />
          )}
          {dayBoundaries.map((b) => (
            <ReferenceLine key={b} x={b} stroke="#E5E7EB" />
          ))}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="tempF"
            stroke="#F59E0B"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="freezingFt"
            stroke="#8B5CF6"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Day labels below the last chart */}
      <div className="mt-1 flex justify-between px-1 text-[10px] font-medium text-gray-500">
        {points.filter((_, i) => i % 12 === 0).map((p) => (
          <span key={p.hour}>{p.dayLabel} {p.label}</span>
        ))}
      </div>

      {/* Favorable windows summary — hide in compact */}
      {!compact && timingWindows.filter((w) => w.favorability === 'more').length > 0 && (
        <div className="mt-3 rounded-lg bg-green-50 px-3 py-2">
          <p className="text-xs font-medium text-green-800">More favorable windows:</p>
          {timingWindows
            .filter((w) => w.favorability === 'more')
            .slice(0, 3)
            .map((w, i) => {
              const startTime = points[w.startHour];
              const endTime = points[w.endHour];
              if (!startTime || !endTime) return null;
              const endDisplayIso = advanceOneHour(endTime.time);
              const now = new Date();
              const endDay = getDayLabel(endDisplayIso, now);
              const sameDay = startTime.dayLabel === endDay;
              return (
                <p key={i} className="mt-0.5 text-[11px] text-green-700">
                  {startTime.dayLabel} {startTime.label} – {sameDay ? '' : `${endDay} `}{formatHourLabel(endDisplayIso)}
                  <span className="ml-1 text-green-600">
                    ({w.reasons.slice(0, 2).join(', ')})
                  </span>
                </p>
              );
            })}
        </div>
      )}

      {/* Mixed / caution windows summary — hide in compact */}
      {!compact && timingWindows.filter((w) => w.favorability === 'caution').length > 0 && (
        <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2">
          <p className="text-xs font-medium text-yellow-800">Mixed conditions — might be OK:</p>
          {timingWindows
            .filter((w) => w.favorability === 'caution')
            .slice(0, 3)
            .map((w, i) => {
              const startTime = points[w.startHour];
              const endTime = points[w.endHour];
              if (!startTime || !endTime) return null;
              const endDisplayIso = advanceOneHour(endTime.time);
              const now = new Date();
              const endDay = getDayLabel(endDisplayIso, now);
              const sameDay = startTime.dayLabel === endDay;
              return (
                <p key={i} className="mt-0.5 text-[11px] text-yellow-700">
                  {startTime.dayLabel} {startTime.label} – {sameDay ? '' : `${endDay} `}{formatHourLabel(endDisplayIso)}
                  <span className="ml-1 text-yellow-600">
                    ({w.reasons.slice(0, 2).join(', ')})
                  </span>
                </p>
              );
            })}
        </div>
      )}

      {/* Disclaimer — hide in compact */}
      {!compact && (
        <p className="mt-3 text-[10px] italic text-gray-500">
          Automated estimate from Open-Meteo. Does not reflect field observations or snowpack structure.
          Confidence degrades for Day 2–3.
        </p>
      )}
    </div>
  );
}

function TrackLabel({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="mb-1 mt-4 flex items-baseline gap-2 first:mt-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-500">{sublabel}</span>}
    </div>
  );
}

/* Custom tooltips */

function WindPrecipTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimelinePoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gray-200">
      <p className="font-medium">{d.dayLabel} {d.label}</p>
      <p>Surface wind: {d.windDir} {d.windMph} mph</p>
      <p>Ridge wind: {d.ridgeWindMph} mph</p>
      <p>Precip: {d.precipIn}{'\u2033'}/hr {d.isSnow ? '\u2744\uFE0F snow' : '\uD83C\uDF27\uFE0F rain'}</p>
      {d.snowIn > 0 && <p>Snowfall: {d.snowIn}{'\u2033'}</p>}
    </div>
  );
}

function TempFreezeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimelinePoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gray-200">
      <p className="font-medium">{d.dayLabel} {d.label}</p>
      <p>Temp: {d.tempF}&deg;F</p>
      <p>Freezing level: {d.freezingFt.toLocaleString()}&apos;</p>
    </div>
  );
}

function OverlayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimelinePoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gray-200">
      <p className="font-medium">{d.dayLabel} {d.label}</p>
      <p>Wind: {d.windDir} {d.windMph} mph · Ridge {d.ridgeWindMph} mph</p>
      <p>Temp: {d.tempF}&deg;F</p>
      <p>Precip: {d.precipIn}{'\u2033'}/hr {d.isSnow ? '\u2744\uFE0F snow' : '\uD83C\uDF27\uFE0F rain'}</p>
    </div>
  );
}
