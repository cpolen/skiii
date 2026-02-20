'use client';

import { useAvyForecast } from '@/hooks/useAvyForecast';
import { DANGER_LABELS } from '@/lib/types/avalanche';
import type { DangerLevel } from '@/lib/types/avalanche';
import type { AvyDangerByDay, AvyProblem, AvyDetailedForecast } from '@/app/api/avalanche/route';

/** NAPADS background + text color classes by danger level */
const DANGER_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
  3: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
  4: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
  5: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
};

const DANGER_ICONS: Record<number, string> = {
  1: '🟢',
  2: '🟡',
  3: '🟠',
  4: '🔴',
  5: '⚫',
};

/** Hex fill colors for NAPADS danger levels (used in SVGs) */
const DANGER_HEX: Record<number, string> = {
  0: '#D1D5DB', // gray-300
  1: '#50B848', // green
  2: '#FFF200', // yellow
  3: '#F7941E', // orange
  4: '#ED1C24', // red
  5: '#231F20', // black
};

/** All 8 compass directions in standard order, with their angle offset from north (0°) */
const ASPECTS = [
  { abbr: 'N',  angle: 0 },
  { abbr: 'NE', angle: 45 },
  { abbr: 'E',  angle: 90 },
  { abbr: 'SE', angle: 135 },
  { abbr: 'S',  angle: 180 },
  { abbr: 'SW', angle: 225 },
  { abbr: 'W',  angle: 270 },
  { abbr: 'NW', angle: 315 },
] as const;

/** Map from location string direction word to abbreviation */
const DIR_MAP: Record<string, string> = {
  north: 'N', northeast: 'NE', east: 'E', southeast: 'SE',
  south: 'S', southwest: 'SW', west: 'W', northwest: 'NW',
};

/** Map from location string elevation word to band key */
const ELEV_MAP: Record<string, 'upper' | 'middle' | 'lower'> = {
  upper: 'upper', middle: 'middle', lower: 'lower',
};

function dangerLabel(level: number): string {
  if (level === 0) return 'None';
  return DANGER_LABELS[level as DangerLevel] ?? `Level ${level}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Map a selected forecast timestamp to the avalanche forecast's valid_day.
 * Returns "current" or "tomorrow". For times beyond the 2-day avy forecast
 * window, falls back to "tomorrow" (the closest available data) rather than
 * returning null — showing stale data with a label is better than nothing.
 */
function resolveAvyDay(
  selectedTime: string | null,
  detailed: AvyDetailedForecast | null,
): { day: 'current' | 'tomorrow'; stale: boolean } {
  if (!selectedTime || !detailed) return { day: 'current', stale: false };

  const sel = new Date(selectedTime);
  const pub = detailed.published_time ? new Date(detailed.published_time) : null;
  if (!pub) return { day: 'current', stale: false };

  const pstOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' };
  const pubDate = new Intl.DateTimeFormat('en-US', pstOptions).format(pub);
  const selDate = new Intl.DateTimeFormat('en-US', pstOptions).format(sel);

  if (selDate === pubDate) return { day: 'current', stale: false };

  const pubNext = new Date(pub);
  pubNext.setDate(pubNext.getDate() + 1);
  const pubNextDate = new Intl.DateTimeFormat('en-US', pstOptions).format(pubNext);
  if (selDate === pubNextDate) return { day: 'tomorrow', stale: false };

  // Beyond 2-day window — fall back to tomorrow's forecast with a stale indicator
  return { day: 'tomorrow', stale: true };
}

function maxDangerForDay(day: AvyDangerByDay): number {
  return Math.max(day.lower, day.middle, day.upper);
}

/** Standard NAPADS travel advice by danger level, used when zone-level advice doesn't match the resolved day */
const NAPADS_TRAVEL_ADVICE: Record<number, string> = {
  1: 'Generally safe avalanche conditions. Watch for unstable snow on isolated terrain features.',
  2: 'Heightened avalanche conditions on specific terrain features. Evaluate snow and terrain carefully.',
  3: 'Dangerous avalanche conditions. Careful snowpack evaluation, cautious route-finding, and conservative decision-making essential.',
  4: 'Very dangerous avalanche conditions. Travel in avalanche terrain not recommended.',
  5: 'Avoid all avalanche terrain. Extremely dangerous conditions with natural avalanches likely.',
};

/**
 * Parse problem location strings into a set of { aspect, band } pairs.
 * e.g. "northwest upper" → { aspect: 'NW', band: 'upper' }
 */
export function parseLocations(locations: string[]): Set<string> {
  const set = new Set<string>();
  for (const loc of locations) {
    const parts = loc.split(' ');
    const dir = DIR_MAP[parts[0]];
    const band = ELEV_MAP[parts[1]];
    if (dir && band) set.add(`${dir}-${band}`);
  }
  return set;
}

/** Extract unique compass directions from location strings */
function extractAspects(locations: string[]): string[] {
  const seen = new Set<string>();
  for (const loc of locations) {
    const dir = loc.split(' ')[0];
    const abbr = DIR_MAP[dir];
    if (abbr) seen.add(abbr);
  }
  const order = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return order.filter((d) => seen.has(d));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AvyDangerBanner({ selectedTime, inline }: { selectedTime?: string | null; inline?: boolean }) {
  const { data, isLoading } = useAvyForecast();

  if (isLoading) {
    return (
      <div className={inline ? 'px-3 py-2' : 'px-4 py-2'}>
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const zone = data?.zones?.[0];
  if (!zone) return null;

  if (zone.off_season) {
    return (
      <div className={`${inline ? 'px-3' : 'px-4'} py-2 text-[11px] text-gray-500`}>
        SAC avalanche forecast: Off season
      </div>
    );
  }

  const detailed = data?.detailed ?? null;
  const { day: avyDay, stale } = resolveAvyDay(selectedTime ?? null, detailed);

  const dayData = detailed?.danger.find((d) => d.valid_day === avyDay);
  const level = dayData ? maxDangerForDay(dayData) : zone.danger_level;
  const levelLabel = dayData ? dangerLabel(level).toLowerCase() : zone.danger;
  const style = DANGER_STYLES[level] ?? DANGER_STYLES[3];
  const icon = DANGER_ICONS[level] ?? '🟠';

  // Use zone travel advice for current day; for tomorrow/stale, derive from the resolved danger level
  // since the zone endpoint only provides today's advice
  const travelAdvice = avyDay === 'current' && !stale
    ? zone.travel_advice
    : NAPADS_TRAVEL_ADVICE[level] ?? zone.travel_advice;

  const dayLabel = avyDay === 'tomorrow'
    ? stale ? 'tomorrow\u2019s forecast — check SAC for updates' : 'tomorrow'
    : null;

  return (
    <div className={inline ? `${style.bg} px-3 py-2.5` : `mx-4 my-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2`}>
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <div className="flex-1">
          <div className={`text-xs font-semibold uppercase ${style.text}`}>
            Avalanche Danger: {levelLabel}
            {dayLabel && (
              <span className="ml-1 text-[9px] font-normal normal-case opacity-70">({dayLabel})</span>
            )}
          </div>
          <p className={`mt-0.5 text-[11px] leading-snug ${style.text}`}>
            {travelAdvice}
          </p>
        </div>
      </div>

      {/* Accordion: detailed danger + problems (closed by default) */}
      {detailed && (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-[10px] font-medium text-gray-600 hover:text-gray-900">
            Danger by elevation &amp; avalanche problems
          </summary>

          <div className="mt-2 space-y-3">
            {/* Danger by elevation — visual bars */}
            <DangerByElevation danger={detailed.danger} activeDay={avyDay} />

            {/* Avalanche problems with rose diagrams */}
            {detailed.problems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Avalanche Problems
                </p>
                {detailed.problems.map((problem, i) => (
                  <ProblemCard key={i} problem={problem} rank={i + 1} />
                ))}
              </div>
            )}

            {/* Bottom line */}
            {detailed.bottom_line && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Bottom Line
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-700">
                  {stripHtml(detailed.bottom_line)}
                </p>
              </div>
            )}

            {/* Author + published time */}
            {detailed.author && (
              <p className="text-[9px] text-gray-400">
                Forecaster: {detailed.author}
                {detailed.published_time && (
                  <>
                    {' · '}
                    {new Date(detailed.published_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </p>
            )}
          </div>
        </details>
      )}

      {/* Footer row */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[9px] text-gray-500">
          {zone.center} &middot; {zone.name}
        </span>
        <a
          href={zone.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-medium text-blue-600 hover:text-blue-800"
        >
          Full forecast &rarr;
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger by Elevation — visual horizontal bars
// ---------------------------------------------------------------------------

function DangerByElevation({ danger, activeDay }: { danger: AvyDangerByDay[]; activeDay: 'current' | 'tomorrow' }) {
  const today = danger.find((d) => d.valid_day === 'current');
  const tomorrow = danger.find((d) => d.valid_day === 'tomorrow');
  if (!today && !tomorrow) return null;

  const active = activeDay === 'current' ? today : tomorrow;
  const other = activeDay === 'current' ? tomorrow : today;

  const bands = [
    { key: 'upper' as const, label: 'Alpine', icon: '▲' },
    { key: 'middle' as const, label: 'Treeline', icon: '◆' },
    { key: 'lower' as const, label: 'Below TL', icon: '▬' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Danger by Elevation
        </p>
        {other && (
          <span className="text-[9px] text-gray-400">
            {activeDay === 'current' ? 'Today' : 'Tomorrow'}
          </span>
        )}
      </div>
      <div className="mt-1.5 space-y-1">
        {bands.map((band) => {
          const level = active?.[band.key] ?? 0;
          const hex = DANGER_HEX[level] ?? DANGER_HEX[0];
          const label = dangerLabel(level);

          return (
            <div key={band.key} className="flex items-center gap-2">
              {/* Elevation label */}
              <span className="w-[60px] text-[10px] text-gray-500">
                <span className="mr-1 text-[8px]">{band.icon}</span>
                {band.label}
              </span>
              {/* Colored danger bar */}
              <div className="relative h-5 flex-1 overflow-hidden rounded">
                <div className="absolute inset-0 rounded bg-gray-100" />
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                  style={{
                    width: `${Math.max((level / 5) * 100, 8)}%`,
                    backgroundColor: hex,
                    opacity: level === 0 ? 0.3 : 0.85,
                  }}
                />
                <div className="relative flex h-full items-center px-2">
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: level >= 4 ? '#fff' : level >= 2 ? '#1f2937' : '#fff' }}
                  >
                    {level} — {label}
                  </span>
                </div>
              </div>
              {/* Tomorrow mini-indicator */}
              {other && (
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
                  style={{ backgroundColor: DANGER_HEX[other[band.key]] ?? DANGER_HEX[0], opacity: 0.6 }}
                  title={`${activeDay === 'current' ? 'Tomorrow' : 'Today'}: ${dangerLabel(other[band.key])}`}
                >
                  <span className="text-[8px] font-bold" style={{ color: other[band.key] >= 4 ? '#fff' : '#1f2937' }}>
                    {other[band.key]}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {other && (
        <p className="mt-1 text-right text-[8px] text-gray-400">
          Small square = {activeDay === 'current' ? 'tomorrow' : 'today'}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem Card — with aspect/elevation rose SVG
// ---------------------------------------------------------------------------

function ProblemCard({ problem, rank }: { problem: AvyProblem; rank: number }) {
  const locations = parseLocations(problem.location);
  const aspects = extractAspects(problem.location);
  const sizeStr =
    problem.size[0] === problem.size[1]
      ? `D${problem.size[0]}`
      : `D${problem.size[0]}–D${problem.size[1]}`;

  // Likelihood as a visual scale (1-5)
  const likelihoodScale: Record<string, number> = {
    unlikely: 1, possible: 2, likely: 3, 'very likely': 4, certain: 5,
  };
  const likelihoodValue = likelihoodScale[problem.likelihood] ?? 2;

  // Size as a visual scale (D1=1 ... D5=5)
  const sizeMin = parseFloat(problem.size[0]) || 1;
  const sizeMax = parseFloat(problem.size[1]) || sizeMin;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/80">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-[9px] font-bold text-white">
          {rank}
        </span>
        <span className="flex-1 text-[11px] font-semibold text-gray-800">{problem.name}</span>
      </div>

      {/* Visual body: rose + stats side by side */}
      <div className="flex gap-2 px-2.5 pb-2">
        {/* Aspect/Elevation rose */}
        <div className="flex-shrink-0">
          <AspectElevationRose locations={locations} />
        </div>

        {/* Stats column */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {/* Likelihood bar */}
          <div>
            <p className="text-[9px] font-medium text-gray-500">Likelihood</p>
            <div className="mt-0.5 flex items-center gap-1">
              <div className="flex gap-[2px]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-2.5 w-3.5 rounded-sm transition-colors"
                    style={{
                      backgroundColor: i <= likelihoodValue
                        ? likelihoodValue >= 4 ? '#EF4444' : likelihoodValue >= 3 ? '#F59E0B' : '#9CA3AF'
                        : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] font-medium text-gray-600">{capitalize(problem.likelihood)}</span>
            </div>
          </div>

          {/* Size range bar */}
          <div>
            <p className="text-[9px] font-medium text-gray-500">Size</p>
            <div className="mt-0.5 flex items-center gap-1">
              <div className="relative h-2.5 w-[70px] rounded-full bg-gray-100">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${((sizeMin - 1) / 4) * 100}%`,
                    right: `${(1 - (sizeMax / 5)) * 100}%`,
                    backgroundColor: sizeMax >= 3 ? '#EF4444' : sizeMax >= 2 ? '#F59E0B' : '#9CA3AF',
                  }}
                />
              </div>
              <span className="text-[9px] font-medium text-gray-600">{sizeStr}</span>
            </div>
          </div>

          {/* Affected aspects text */}
          <div className="flex flex-wrap gap-0.5">
            {aspects.map((a) => (
              <span key={a} className="rounded bg-gray-100 px-1 py-0.5 text-[8px] font-medium text-gray-500">
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Discussion (collapsible) */}
      {problem.discussion && (
        <details className="border-t border-gray-100">
          <summary className="cursor-pointer select-none px-2.5 py-1.5 text-[9px] font-medium text-gray-400 hover:text-gray-600">
            Details
          </summary>
          <p className="px-2.5 pb-2 text-[10px] leading-snug text-gray-600">
            {stripHtml(problem.discussion).slice(0, 400)}
            {stripHtml(problem.discussion).length > 400 ? '...' : ''}
          </p>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aspect/Elevation Rose — SVG showing 8 aspects × 3 elevation bands
// ---------------------------------------------------------------------------

/**
 * Draws a compact rose diagram with 3 concentric rings (outer=Alpine, mid=Treeline, inner=Below TL)
 * and 8 wedge sectors for each compass direction.
 * Affected sectors are filled with a danger color; unaffected sectors are light gray.
 */
export function AspectElevationRose({ locations }: { locations: Set<string> }) {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  // Radii for 3 rings: outer edge, ring boundaries
  const rOuter = 42;
  const rMid = 30;
  const rInner = 18;
  const rCenter = 6;

  const halfSector = Math.PI / 8; // 22.5° — half of a 45° sector

  // Build SVG paths for each wedge in each ring
  const wedges: { d: string; active: boolean; key: string }[] = [];

  for (const aspect of ASPECTS) {
    const angleRad = (aspect.angle * Math.PI) / 180;
    const a1 = angleRad - halfSector;
    const a2 = angleRad + halfSector;

    // Ring definitions: [outerR, innerR, bandKey]
    const rings: [number, number, 'upper' | 'middle' | 'lower'][] = [
      [rOuter, rMid, 'upper'],
      [rMid, rInner, 'middle'],
      [rInner, rCenter, 'lower'],
    ];

    for (const [outerR, innerR, band] of rings) {
      const active = locations.has(`${aspect.abbr}-${band}`);
      // SVG arc wedge path
      const ox1 = cx + outerR * Math.sin(a1);
      const oy1 = cy - outerR * Math.cos(a1);
      const ox2 = cx + outerR * Math.sin(a2);
      const oy2 = cy - outerR * Math.cos(a2);
      const ix1 = cx + innerR * Math.sin(a2);
      const iy1 = cy - innerR * Math.cos(a2);
      const ix2 = cx + innerR * Math.sin(a1);
      const iy2 = cy - innerR * Math.cos(a1);

      const d = [
        `M ${ox1} ${oy1}`,
        `A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerR} ${innerR} 0 0 0 ${ix2} ${iy2}`,
        'Z',
      ].join(' ');

      wedges.push({ d, active, key: `${aspect.abbr}-${band}` });
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={100} height={100}>
      {/* Ring boundary circles */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={rMid} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />

      {/* Wedges */}
      {wedges.map((w) => (
        <path
          key={w.key}
          d={w.d}
          fill={w.active ? '#EF4444' : '#F3F4F6'}
          stroke="#fff"
          strokeWidth={0.8}
          opacity={w.active ? 0.85 : 0.5}
        />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={rCenter} fill="#fff" stroke="#e5e7eb" strokeWidth={0.5} />

      {/* Compass labels */}
      {ASPECTS.map((a) => {
        const angleRad = (a.angle * Math.PI) / 180;
        const lr = rOuter + 6;
        const lx = cx + lr * Math.sin(angleRad);
        const ly = cy - lr * Math.cos(angleRad);
        return (
          <text
            key={a.abbr}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#6B7280"
            fontSize={7}
            fontWeight={a.abbr === 'N' ? 700 : 500}
          >
            {a.abbr}
          </text>
        );
      })}

      {/* Ring labels at bottom-right */}
      <text x={size - 2} y={size - 14} textAnchor="end" fill="#9CA3AF" fontSize={5.5}>Alpine</text>
      <text x={size - 2} y={size - 8} textAnchor="end" fill="#9CA3AF" fontSize={5.5}>Treeline</text>
      <text x={size - 2} y={size - 2} textAnchor="end" fill="#9CA3AF" fontSize={5.5}>Below TL</text>
    </svg>
  );
}
