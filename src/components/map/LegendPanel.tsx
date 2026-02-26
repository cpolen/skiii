'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useMapStore } from '@/stores/map';
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { AspectElevationRose, parseLocations } from '@/components/tour/AvyDangerBanner';
import { getSunPosition } from '@/lib/analysis/solar';
import { metersToFeet } from '@/lib/types/conditions';

// ---------------------------------------------------------------------------
// Sun helpers (duplicated from SunExposureOverlay — small pure functions)
// ---------------------------------------------------------------------------

const TAHOE_LAT = 39.0968;
const TAHOE_LNG = -120.0324;

function getForecastDate(hour: number | null): Date {
  if (hour == null) return new Date();
  const now = new Date();
  const pacific = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [m, d, y] = pacific.split('/');
  const targetNoon = new Date(`${y}-${m}-${d}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'shortOffset',
  });
  const tzPart = formatter.formatToParts(targetNoon).find((p) => p.type === 'timeZoneName');
  const offsetHours = parseInt(tzPart?.value?.replace('GMT', '') ?? '-8', 10);
  const offsetStr = `${offsetHours < 0 ? '-' : '+'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  const midnight = new Date(`${y}-${m}-${d}T00:00:00${offsetStr}`);
  return new Date(midnight.getTime() + hour * 3600000);
}

function azimuthToCompass(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(az / 45) % 8];
}

// ---------------------------------------------------------------------------
// Shared avy problems accordion
// ---------------------------------------------------------------------------

function AvyProblemsSection() {
  const [expanded, setExpanded] = useState(false);
  const { data: avyData } = useAvyForecast();
  const problems = avyData?.detailed?.problems ?? [];

  if (problems.length === 0) return null;

  return (
    <div className="mt-2 border-t border-white/20 pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-wider text-gray-300"
      >
        <span>Avy Problems ({problems.length})</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-2">
          {problems.map((p, i) => {
            const locations = parseLocations(p.location);
            return (
              <div key={i} className="flex items-center gap-2">
                <AspectElevationRose locations={locations} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-white">{p.name}</p>
                  <p className="text-[9px] text-gray-400">
                    {p.likelihood} &middot; D{p.size[0]}–D{p.size[1]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual legend sections
// ---------------------------------------------------------------------------

function SlopeLegend() {
  const ranges = [
    { label: '25-29°', color: '#4CAF50' },
    { label: '30-34°', color: '#FFEB3B' },
    { label: '35-39°', color: '#FF9800' },
    { label: '40-44°', color: '#F44336' },
    { label: '45-49°', color: '#E91E63' },
    { label: '50°+', color: '#9C27B0' },
  ];

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Slope Angle
      </div>
      <div className="flex gap-0.5">
        {ranges.map((r) => (
          <div key={r.label} className="flex flex-col items-center">
            <div className="h-3 w-6 rounded-sm" style={{ background: r.color, opacity: 0.85 }} />
            <span className="mt-0.5 text-[8px] text-gray-400">{r.label}</span>
          </div>
        ))}
      </div>
      <AvyProblemsSection />
      <div className="mt-1.5 border-t border-white/20 pt-1 text-[9px] text-gray-500">
        &lt; 25° not shaded
      </div>
    </div>
  );
}

function AspectLegend() {
  const N_COLOR = 'rgba(234,179,8,0.85)';
  const E_COLOR = 'rgba(59,130,246,0.85)';
  const S_COLOR = 'rgba(168,85,247,0.85)';
  const W_COLOR = 'rgba(239,68,68,0.85)';

  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Slope Aspect
      </div>
      <svg viewBox="0 0 100 100" width="90" height="90" className="mx-auto">
        <polygon points="50,8 42,42 50,38 58,42" fill={N_COLOR} />
        <polygon points="50,92 42,58 50,62 58,58" fill={S_COLOR} />
        <polygon points="92,50 58,42 62,50 58,58" fill={E_COLOR} />
        <polygon points="8,50 42,42 38,50 42,58" fill={W_COLOR} />
        <circle cx="50" cy="50" r="3" fill="rgba(255,255,255,0.5)" />
        <text x="50" y="6" textAnchor="middle" fill={N_COLOR} fontSize="9" fontWeight="700">N</text>
        <text x="50" y="99" textAnchor="middle" fill={S_COLOR} fontSize="9" fontWeight="700">S</text>
        <text x="97" y="53" textAnchor="end" fill={E_COLOR} fontSize="9" fontWeight="700">E</text>
        <text x="3" y="53" textAnchor="start" fill={W_COLOR} fontSize="9" fontWeight="700">W</text>
      </svg>
      <div className="mt-1 border-t border-white/20 pt-1 text-[9px] text-gray-500">
        Flat terrain appears unshaded
      </div>
    </div>
  );
}

function SunExposureLegend() {
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const sunDate = useMemo(() => getForecastDate(selectedForecastHour), [selectedForecastHour]);
  const sun = useMemo(() => getSunPosition(sunDate, TAHOE_LAT, TAHOE_LNG), [sunDate]);
  const isNight = sun.elevation <= 0;

  const timeLabel =
    selectedForecastHour != null
      ? sunDate.toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'short',
          hour: 'numeric',
          minute: undefined,
          hour12: true,
        })
      : 'Now';

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Sun Exposure
      </div>
      {isNight ? (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-300">
          <span>🌙</span>
          <span>Night — sun below horizon</span>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px]">
            <span>☀️</span>
            <span>
              {azimuthToCompass(sun.azimuth)} at {Math.round(sun.elevation)}° elevation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-3 w-5 rounded-sm" style={{ background: 'rgba(255, 200, 50, 1.0)' }} />
              <span className="text-[9px] text-gray-400">Sun</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-5 rounded-sm" style={{ background: 'rgba(20, 30, 80, 0.95)' }} />
              <span className="text-[9px] text-gray-400">Shade</span>
            </div>
          </div>
        </>
      )}
      <div className="mt-1.5 border-t border-white/20 pt-1 text-[9px] text-gray-500">
        {timeLabel}
      </div>
    </div>
  );
}

function TreeCoverLegend() {
  const ranges = [
    { label: 'Sparse', color: 'rgba(200, 230, 190, 0.8)' },
    { label: 'Light', color: 'rgba(140, 200, 120, 0.85)' },
    { label: 'Dense', color: 'rgba(70, 150, 50, 0.9)' },
    { label: 'Thick', color: 'rgba(30, 100, 20, 0.95)' },
  ];

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Tree Canopy Cover
      </div>
      <div className="flex gap-0.5">
        {ranges.map((r) => (
          <div key={r.label} className="flex flex-col items-center">
            <div className="h-3 w-6 rounded-sm" style={{ background: r.color }} />
            <span className="mt-0.5 text-[8px] text-gray-400">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 border-t border-white/20 pt-1 text-[9px] text-gray-500">
        NLCD 30m canopy density
      </div>
    </div>
  );
}

function PrecipWindLegend() {
  const showPrecip = useMapStore((s) => s.showPrecip);
  const showWind = useMapStore((s) => s.showWind);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const data = useMapStore((s) => s.precipLegendData);

  if (!data) return null;

  if (data.isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 text-[11px] text-gray-300">
          <div className="h-3 w-3 animate-spin rounded-full border border-gray-500 border-t-white" />
          Loading weather grid…
        </div>
      </div>
    );
  }

  if (data.isError) {
    return (
      <div>
        <div className="text-[11px] text-red-400">Weather data unavailable</div>
      </div>
    );
  }

  return (
    <div>
      {showPrecip && (
        <>
          {data.avgFreezingLevel !== null && (
            <div className="mb-2 flex items-center gap-1.5 border-b border-white/20 pb-2 text-[11px] font-medium">
              <span>❄️</span>
              <span>Snow level: ~{metersToFeet(data.avgFreezingLevel).toLocaleString()}&apos;</span>
            </div>
          )}

          {data.hasSnow && (
            <div className="mb-1.5">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-300">Snow</div>
              <div
                className="h-2.5 w-24 rounded-sm"
                style={{
                  background:
                    'linear-gradient(to right, rgba(186,230,253,0.28), rgba(56,189,248,0.40), rgba(2,132,199,0.50), rgba(7,89,133,0.55), rgba(136,19,220,0.60))',
                }}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-400" style={{ width: '6rem' }}>
                <span>Light</span>
                <span>Heavy</span>
              </div>
            </div>
          )}

          {data.hasRain && (
            <div className={showWind ? 'mb-1.5' : ''}>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-green-300">Rain</div>
              <div
                className="h-2.5 w-24 rounded-sm"
                style={{
                  background:
                    'linear-gradient(to right, rgba(74,222,128,0.25), rgba(250,204,21,0.4), rgba(251,146,60,0.5), rgba(239,68,68,0.58))',
                }}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-400" style={{ width: '6rem' }}>
                <span>Light</span>
                <span>Heavy</span>
              </div>
            </div>
          )}

          {!data.hasSnow && !data.hasRain && (
            <div className={`text-[11px] text-gray-400${showWind ? ' mb-1.5' : ''}`}>No active precipitation</div>
          )}
        </>
      )}

      {showWind && (
        <div className={showPrecip ? 'border-t border-white/20 pt-1.5' : ''}>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-300">Wind (ridge)</div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span style={{ color: '#93C5FD' }}>→</span>
            <span className="text-gray-400">Calm</span>
            <span style={{ color: '#F59E0B' }}>→</span>
            <span className="text-gray-400">Moderate</span>
            <span style={{ color: '#EF4444' }}>→</span>
            <span className="text-gray-400">Strong</span>
          </div>
        </div>
      )}

      {!selectedTourSlug && (
        <div className="mt-1.5 border-t border-white/20 pt-1.5 text-[9px] text-gray-500">
          Select a tour for detailed coverage
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LegendPanel
// ---------------------------------------------------------------------------

export function LegendPanel() {
  const showSlopeAngle = useMapStore((s) => s.showSlopeAngle);
  const showAspect = useMapStore((s) => s.showAspect);
  const showSunExposure = useMapStore((s) => s.showSunExposure);
  const showTreeCover = useMapStore((s) => s.showTreeCover);
  const showPrecip = useMapStore((s) => s.showPrecip);
  const showWind = useMapStore((s) => s.showWind);
  const viewMode = useMapStore((s) => s.viewMode);

  const activeCount = [showSlopeAngle, showAspect, showSunExposure, showTreeCover, showPrecip, showWind].filter(
    Boolean,
  ).length;

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Auto-close when no active legends
  useEffect(() => {
    if (activeCount === 0) setOpen(false);
  }, [activeCount]);

  if (activeCount === 0) return null;

  return (
    <div ref={panelRef} className={`absolute bottom-64 right-3 z-30 flex flex-col items-end gap-2 md:bottom-52 ${viewMode === 'detail' ? 'md:right-[412px]' : ''}`}>
      {open && (
        <div className="max-h-[50vh] overflow-y-auto rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm">
          <div className="space-y-3">
            {showSlopeAngle && <SlopeLegend />}
            {showAspect && <AspectLegend />}
            {showSunExposure && <SunExposureLegend />}
            {showTreeCover && <TreeCoverLegend />}
            {(showPrecip || showWind) && <PrecipWindLegend />}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-full bg-gray-900/85 px-3 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-800/90"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Legend
        <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/20 px-1 text-[9px]">
          {activeCount}
        </span>
      </button>
    </div>
  );
}
