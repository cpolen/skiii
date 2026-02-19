'use client';

import type { Tour } from '@/lib/types/tour';
import { useMapStore } from '@/stores/map';

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

/**
 * Extract elevation data from the selected variant's route + ski_route.
 * GeoJSON LineString coordinates are [lng, lat, elevation?].
 * If no elevation data, generate a synthetic profile.
 */
function getElevationData(tour: Tour, variantIndex: number): { distance: number; elevation: number; segment: 'skin' | 'ski' | 'default' }[] {
  const variant = tour.variants[variantIndex] ?? tour.variants[0];
  if (!variant) return [];

  const hasSkiRoute = !!variant.ski_route;
  const points: { distance: number; elevation: number; segment: 'skin' | 'ski' | 'default' }[] = [];

  // Build a list of (coords, segment) pairs to walk through
  const segments: { coords: number[][]; segment: 'skin' | 'ski' | 'default' }[] = [
    { coords: variant.route.geometry.coordinates, segment: hasSkiRoute ? 'skin' : 'default' },
  ];
  if (variant.ski_route) {
    segments.push({ coords: variant.ski_route.geometry.coordinates, segment: 'ski' });
  }

  let totalDist = 0;
  let prevCoord: number[] | null = null;

  for (const seg of segments) {
    for (let i = 0; i < seg.coords.length; i++) {
      const coord = seg.coords[i];
      if (prevCoord) {
        const [lng1, lat1] = prevCoord;
        const [lng2, lat2] = coord;
        totalDist += haversineMi(lat1, lng1, lat2, lng2);
      }

      const totalPoints = segments.reduce((sum, s) => sum + s.coords.length, 0);
      const elevation = coord[2] ?? interpolateElevation(points.length, totalPoints, tour);

      points.push({
        distance: Math.round(totalDist * 100) / 100,
        elevation: metersToFeet(elevation),
        segment: seg.segment,
      });

      prevCoord = coord;
    }
  }

  return points;
}

function interpolateElevation(index: number, total: number, tour: Tour): number {
  const ratio = index / Math.max(total - 1, 1);
  return tour.min_elevation_m + ratio * (tour.max_elevation_m - tour.min_elevation_m);
}

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Segment color keyed by segment type. */
const SEGMENT_COLORS: Record<string, { line: string; fill: string }> = {
  skin: { line: '#22C55E', fill: '#22C55E' },   // green
  ski:  { line: '#F97316', fill: '#F97316' },    // orange
  default: { line: '#3B82F6', fill: '#3B82F6' }, // blue
};

export function ElevationProfile({ tour }: { tour: Tour }) {
  const selectedVariantIndex = useMapStore((s) => s.selectedVariantIndex);
  const data = getElevationData(tour, selectedVariantIndex);
  if (data.length < 2) {
    return <p className="text-xs text-gray-500">No elevation data available</p>;
  }

  const minElev = Math.min(...data.map((d) => d.elevation));
  const maxElev = Math.max(...data.map((d) => d.elevation));
  const maxDist = data[data.length - 1].distance;

  // SVG dimensions
  const width = 500;
  const height = 150;
  const padLeft = 45;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 25;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const elevRange = maxElev - minElev || 1;
  const distRange = maxDist || 1;

  function x(dist: number): number {
    return padLeft + (dist / distRange) * chartW;
  }
  function y(elev: number): number {
    return padTop + chartH - ((elev - minElev) / elevRange) * chartH;
  }

  // Build contiguous runs with the same segment type
  const chartSegments: { points: typeof data; type: string }[] = [];
  let currentType = data[0].segment;
  let currentPoints = [data[0]];

  for (let i = 1; i < data.length; i++) {
    if (data[i].segment !== currentType) {
      chartSegments.push({ points: currentPoints, type: currentType });
      // Overlap last point so segments connect visually
      currentPoints = [data[i - 1], data[i]];
      currentType = data[i].segment;
    } else {
      currentPoints.push(data[i]);
    }
  }
  chartSegments.push({ points: currentPoints, type: currentType });

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minElev + (elevRange * i) / yTicks),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Elevation profile for ${tour.name}: ${metersToFeet(tour.min_elevation_m).toLocaleString()} to ${metersToFeet(tour.max_elevation_m).toLocaleString()} feet over ${maxDist.toFixed(1)} miles`}
    >
      {/* Grid lines */}
      {yTickValues.map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
          <text x={padLeft - 4} y={y(tick) + 3} textAnchor="end" fill="#9ca3af" fontSize={9}>
            {tick.toLocaleString()}&apos;
          </text>
        </g>
      ))}

      {/* Colored segments */}
      {chartSegments.map((seg, si) => {
        const colors = SEGMENT_COLORS[seg.type] ?? SEGMENT_COLORS.default;
        const linePath = seg.points
          .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.distance)},${y(d.elevation)}`)
          .join(' ');
        const areaPath =
          `${linePath} L${x(seg.points[seg.points.length - 1].distance)},${y(minElev)} L${x(seg.points[0].distance)},${y(minElev)} Z`;

        return (
          <g key={si}>
            <path d={areaPath} fill={colors.fill} fillOpacity={0.1} />
            <path d={linePath} fill="none" stroke={colors.line} strokeWidth={2} strokeLinejoin="round" />
          </g>
        );
      })}

      {/* X-axis label */}
      <text x={width / 2} y={height - 2} textAnchor="middle" fill="#9ca3af" fontSize={9}>
        Distance (mi)
      </text>

      {/* Distance ticks */}
      {[0, maxDist / 2, maxDist].map((dist) => (
        <text key={dist} x={x(dist)} y={height - 12} textAnchor="middle" fill="#9ca3af" fontSize={8}>
          {dist.toFixed(1)}
        </text>
      ))}

      {/* Segment type labels if tour has skin/ski segments */}
      {chartSegments.length > 1 && chartSegments.map((seg, si) => {
        const midIdx = Math.floor(seg.points.length / 2);
        const mid = seg.points[midIdx];
        const colors = SEGMENT_COLORS[seg.type] ?? SEGMENT_COLORS.default;
        const label = seg.type === 'skin' ? '▲ Skin' : seg.type === 'ski' ? '▼ Ski' : '';
        if (!label) return null;
        return (
          <text
            key={`label-${si}`}
            x={x(mid.distance)}
            y={y(mid.elevation) - 6}
            textAnchor="middle"
            fill={colors.line}
            fontSize={8}
            fontWeight="600"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
