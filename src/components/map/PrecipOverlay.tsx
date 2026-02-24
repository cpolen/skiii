'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { useGridPrecip } from '@/hooks/useGridPrecip';
import type { GridBbox } from '@/hooks/useGridPrecip';
import type { GridPrecipPoint } from '@/lib/types/conditions';
import { metersToFeet, kmhToMph } from '@/lib/types/conditions';
import { tours } from '@/data/tours';

const PRECIP_SOURCE = 'precip-fill-source';
const PRECIP_LAYER = 'precip-fill-layer';
const SNOW_LEVEL_SOURCE = 'snow-level-source';
const SNOW_LEVEL_LAYER = 'snow-level-labels';
const SNOW_LABELS_SOURCE = 'snow-labels-source';
const SNOW_LABELS_LAYER = 'snow-labels-layer';
const WIND_LABELS_SOURCE = 'wind-grid-labels-source';
const WIND_ARROWS_LAYER = 'wind-grid-arrows-layer';
const WIND_LABELS_LAYER = 'wind-grid-labels-layer';

const ALL_LAYERS = [
  PRECIP_LAYER, SNOW_LEVEL_LAYER, SNOW_LABELS_LAYER,
  WIND_ARROWS_LAYER, WIND_LABELS_LAYER,
];
const ALL_SOURCES = [
  PRECIP_SOURCE, SNOW_LEVEL_SOURCE, SNOW_LABELS_SOURCE,
  WIND_LABELS_SOURCE,
];

/** ~2 miles in degrees latitude. */
const BUFFER_DEG = 0.03;

/**
 * Compute a bounding box around all route variant coordinates with a 2-mile buffer.
 */
function computeRouteBbox(slug: string): GridBbox | null {
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const variant of tour.variants) {
    const allCoords = [
      ...(variant.route.geometry.coordinates as [number, number][]),
      ...((variant.ski_route?.geometry.coordinates ?? []) as [number, number][]),
    ];
    for (const [lng, lat] of allCoords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  if (!isFinite(minLat)) return null;

  return {
    latMin: Math.round((minLat - BUFFER_DEG) * 1000) / 1000,
    latMax: Math.round((maxLat + BUFFER_DEG) * 1000) / 1000,
    lngMin: Math.round((minLng - BUFFER_DEG) * 1000) / 1000,
    lngMax: Math.round((maxLng + BUFFER_DEG) * 1000) / 1000,
    step: 0.005,
  };
}

/**
 * Bilinear interpolation between four corner values.
 * tx, ty are 0–1 within the cell.
 */
function bilerp(tl: number, tr: number, bl: number, br: number, tx: number, ty: number) {
  const top = tl + (tr - tl) * tx;
  const bot = bl + (br - bl) * tx;
  return top + (bot - top) * ty;
}

/**
 * Build an interpolated fill grid from the API data points.
 * Subdivides each API cell into SUB×SUB sub-cells with bilinearly
 * interpolated values, producing a smooth gradient across the area.
 */
function buildInterpolatedGeoJSON(points: GridPrecipPoint[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Index points by their REQUESTED grid coordinates (not the snapped API coords).
  const gridMap = new Map<string, GridPrecipPoint>();
  const lats = new Set<number>();
  const lngs = new Set<number>();

  for (const p of points) {
    const key = `${p.reqLat.toFixed(4)},${p.reqLng.toFixed(4)}`;
    gridMap.set(key, p);
    lats.add(p.reqLat);
    lngs.add(p.reqLng);
  }

  const sortedLats = Array.from(lats).sort((a, b) => b - a); // descending (N→S)
  const sortedLngs = Array.from(lngs).sort((a, b) => a - b); // ascending (W→E)

  if (sortedLats.length < 2 || sortedLngs.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const lookup = (lat: number, lng: number): GridPrecipPoint | undefined => {
    return gridMap.get(`${lat.toFixed(4)},${lng.toFixed(4)}`);
  };

  const SUB = 4;
  const features: GeoJSON.Feature[] = [];

  for (let r = 0; r < sortedLats.length - 1; r++) {
    for (let c = 0; c < sortedLngs.length - 1; c++) {
      const lat0 = sortedLats[r];
      const lat1 = sortedLats[r + 1];
      const lng0 = sortedLngs[c];
      const lng1 = sortedLngs[c + 1];

      const tl = lookup(lat0, lng0);
      const tr = lookup(lat0, lng1);
      const bl = lookup(lat1, lng0);
      const br = lookup(lat1, lng1);

      if (!tl || !tr || !bl || !br) continue;

      const dLat = (lat0 - lat1) / SUB;
      const dLng = (lng1 - lng0) / SUB;

      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const tx = (sx + 0.5) / SUB;
          const ty = (sy + 0.5) / SUB;

          const snowfall = bilerp(tl.snowfall, tr.snowfall, bl.snowfall, br.snowfall, tx, ty);
          const precipitation = bilerp(tl.precipitation, tr.precipitation, bl.precipitation, br.precipitation, tx, ty);

          if (snowfall <= 0.01 && precipitation <= 0.01) continue;

          const isSnow = snowfall > precipitation * 0.1;
          const intensity = isSnow ? snowfall : precipitation;

          const subLat0 = lat0 - sy * dLat;
          const subLat1 = lat0 - (sy + 1) * dLat;
          const subLng0 = lng0 + sx * dLng;
          const subLng1 = lng0 + (sx + 1) * dLng;

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [subLng0, subLat0],
                [subLng1, subLat0],
                [subLng1, subLat1],
                [subLng0, subLat1],
                [subLng0, subLat0],
              ]],
            },
            properties: { precipType: isSnow ? 'snow' : 'rain', intensity },
          });
        }
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Build snowfall rate labels dispersed across the grid area.
 * Samples every ~4th point in each dimension so labels don't overlap.
 */
function buildSnowfallLabelsGeoJSON(points: GridPrecipPoint[]): GeoJSON.FeatureCollection {
  const snowPoints = points.filter((p) => p.snowfall > 0);
  if (snowPoints.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const lats = [...new Set(snowPoints.map((p) => p.reqLat))].sort((a, b) => b - a);
  const lngs = [...new Set(snowPoints.map((p) => p.reqLng))].sort((a, b) => a - b);

  // Sample every 4th grid row/col for label placement
  const LABEL_SPACING = 4;
  const sampledLats = lats.filter((_, i) => i % LABEL_SPACING === Math.floor(LABEL_SPACING / 2));
  const sampledLngs = lngs.filter((_, i) => i % LABEL_SPACING === Math.floor(LABEL_SPACING / 2));

  const lookup = new Map<string, GridPrecipPoint>();
  for (const p of snowPoints) {
    lookup.set(`${p.reqLat.toFixed(4)},${p.reqLng.toFixed(4)}`, p);
  }

  const features: GeoJSON.Feature[] = [];
  for (const lat of sampledLats) {
    for (const lng of sampledLngs) {
      const p = lookup.get(`${lat.toFixed(4)},${lng.toFixed(4)}`);
      if (!p || p.snowfall <= 0.01) continue;

      // Convert cm/hr to inches/hr for display
      const inPerHr = p.snowfall / 2.54;
      features.push({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.reqLng, p.reqLat] },
        properties: {
          label: `${inPerHr.toFixed(1)}″/hr`,
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Build a dense field of tiny wind arrows at every grid point.
 * Arrow direction shows where wind is coming FROM (met convention),
 * color encodes intensity (blue → amber → red).
 */
function buildWindFieldGeoJSON(points: GridPrecipPoint[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const features: GeoJSON.Feature[] = [];
  for (const p of points) {
    const ridgeMph = kmhToMph(p.wind_speed_80m);

    features.push({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.reqLng, p.reqLat] },
      properties: {
        wind_direction: p.wind_direction_10m,
        ridge_mph: ridgeMph,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

function buildSnowLevelGeoJSON(points: GridPrecipPoint[]): GeoJSON.FeatureCollection {
  const precipPoints = points.filter((p) => p.precipitation > 0 || p.snowfall > 0);
  if (precipPoints.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const avgLat = precipPoints.reduce((s, p) => s + p.reqLat, 0) / precipPoints.length;
  const avgLng = precipPoints.reduce((s, p) => s + p.reqLng, 0) / precipPoints.length;

  let best = precipPoints[0];
  let bestDist = Infinity;
  for (const p of precipPoints) {
    const d = (p.reqLat - avgLat) ** 2 + (p.reqLng - avgLng) ** 2;
    if (d < bestDist) { bestDist = d; best = p; }
  }

  const ft = metersToFeet(best.freezing_level_height);
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [best.reqLng, best.reqLat] },
      properties: { label: `Snow level: ${ft.toLocaleString()}'` },
    }],
  };
}

function removeAll(map: mapboxgl.Map) {
  try {
    for (const id of ALL_LAYERS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of ALL_SOURCES) {
      if (map.getSource(id)) map.removeSource(id);
    }
  } catch {
    // Map may already be torn down
  }
}

function addOrUpdateSource(map: mapboxgl.Map, id: string, geojson: GeoJSON.FeatureCollection) {
  if (map.getSource(id)) {
    (map.getSource(id) as GeoJSONSource).setData(geojson);
  } else {
    map.addSource(id, { type: 'geojson', data: geojson });
  }
}

/**
 * Compute a grid step size based on zoom level.
 * Higher zoom → finer grid. Targets ~15-20 arrows across the viewport.
 */
function stepForZoom(zoom: number): number {
  if (zoom >= 13) return 0.003;  // ~330m — very detailed
  if (zoom >= 11) return 0.005;  // ~550m — detailed
  if (zoom >= 10) return 0.01;   // ~1.1km — moderate
  if (zoom >= 9)  return 0.02;   // ~2.2km — overview
  if (zoom >= 8)  return 0.08;   // ~8.8km — zoomed out
  if (zoom >= 7)  return 0.15;   // ~16.5km — wide view
  return 0.25;                    // ~27.5km — very wide
}

/**
 * Round a bbox to the nearest grid step to avoid constant refetching.
 * Automatically coarsens the step if the grid would exceed 900 points
 * (API caps at 1000).
 */
function roundBbox(
  latMin: number, latMax: number, lngMin: number, lngMax: number, step: number,
): GridBbox {
  let s = step;
  const latSpan = latMax - latMin;
  const lngSpan = lngMax - lngMin;
  while (Math.ceil(latSpan / s + 1) * Math.ceil(lngSpan / s + 1) > 900) {
    s *= 1.5;
  }
  return {
    latMin: Math.floor(latMin / s) * s,
    latMax: Math.ceil(latMax / s) * s,
    lngMin: Math.floor(lngMin / s) * s,
    lngMax: Math.ceil(lngMax / s) * s,
    step: Math.round(s * 10000) / 10000,
  };
}

export function PrecipOverlay({ map }: { map: mapboxgl.Map | null }) {
  const showPrecip = useMapStore((s) => s.showPrecip);
  const showWind = useMapStore((s) => s.showWind);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  // Track the current viewport bounds for wind grid fetching
  const [viewportBbox, setViewportBbox] = useState<GridBbox | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateViewport = useCallback(() => {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const zoom = map.getZoom();
    const step = stepForZoom(zoom);
    const bbox = roundBbox(
      bounds.getSouth(), bounds.getNorth(),
      bounds.getWest(), bounds.getEast(),
      step,
    );
    setViewportBbox(bbox);
  }, [map]);

  // Listen for map moves to update the viewport bbox (debounced)
  useEffect(() => {
    if (!map || (!showPrecip && !showWind)) return;

    // Set initial viewport
    updateViewport();

    function onMove() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(updateViewport, 300);
    }

    map.on('moveend', onMove);
    return () => {
      map.off('moveend', onMove);
      clearTimeout(debounceRef.current);
    };
  }, [map, showPrecip, showWind, updateViewport]);

  // For precip fill, use route bbox if a tour is selected (finer grid around route)
  const precipBbox = useMemo(
    () => (selectedTourSlug ? computeRouteBbox(selectedTourSlug) : viewportBbox),
    [selectedTourSlug, viewportBbox],
  );

  // Wind always uses viewport bbox so it fills the visible area
  const setLayerLoading = useMapStore((s) => s.setLayerLoading);

  const { data: gridData, isLoading, isError, isFetching } = useGridPrecip(
    viewportBbox ?? precipBbox,
    selectedForecastHour,
    showPrecip || showWind,
  );

  // Report fetching state so layer buttons can show spinners
  useEffect(() => {
    if (showPrecip) setLayerLoading('precip', isFetching);
    if (showWind) setLayerLoading('wind', isFetching);
    return () => {
      setLayerLoading('precip', false);
      setLayerLoading('wind', false);
    };
  }, [isFetching, showPrecip, showWind, setLayerLoading]);

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!map!.isStyleLoaded()) return;

      if (!showPrecip && !showWind) {
        removeAll(map!);
        return;
      }

      // Wait for grid data to load — don't tear down existing layers
      if (!gridData) return;

      const beforeLayer = map!.getLayer('tour-markers-layer')
        ? 'tour-markers-layer'
        : undefined;

      // --- Precipitation fill grid ---
      if (showPrecip) {
        const geojson = buildInterpolatedGeoJSON(gridData.points);
        addOrUpdateSource(map!, PRECIP_SOURCE, geojson);

        if (!map!.getLayer(PRECIP_LAYER)) {
          // Color ramp tuned so the typical storm range (0.1–1.5 cm/hr)
          // spans a wide blue spectrum from pale → sky → cobalt → deep blue → purple.
          map!.addLayer({
            id: PRECIP_LAYER,
            type: 'fill',
            source: PRECIP_SOURCE,
            paint: {
              'fill-color': [
                'match', ['get', 'precipType'],
                'snow', [
                  'interpolate', ['linear'], ['get', 'intensity'],
                  0,    'rgba(224,242,254,0)',     // transparent
                  0.1,  'rgba(224,242,254,1)',     // sky-50  — trace
                  0.2,  'rgba(186,230,253,1)',     // sky-200 — very light
                  0.35, 'rgba(125,211,252,1)',     // sky-300 — light
                  0.5,  'rgba(56,189,248,1)',      // sky-400 — moderate-light
                  0.7,  'rgba(14,165,233,1)',      // sky-500 — moderate
                  0.9,  'rgba(2,132,199,1)',       // sky-600 — moderate-heavy
                  1.2,  'rgba(3,105,161,1)',       // sky-700 — heavy
                  1.8,  'rgba(7,89,133,1)',        // sky-800 — very heavy
                  3.0,  'rgba(136,19,220,1)',      // purple  — extreme
                ],
                // rain: green → yellow → orange → red
                [
                  'interpolate', ['linear'], ['get', 'intensity'],
                  0,   'rgba(134,239,172,0)',
                  0.1, 'rgba(134,239,172,1)',      // green-300
                  0.3, 'rgba(74,222,128,1)',        // green-400
                  0.8, 'rgba(250,204,21,1)',        // yellow-400
                  2.0, 'rgba(251,146,60,1)',        // orange-400
                  5.0, 'rgba(239,68,68,1)',         // red-500
                  10,  'rgba(185,28,28,1)',          // red-700
                ],
              ],
              'fill-opacity': [
                'interpolate', ['linear'], ['get', 'intensity'],
                0, 0,
                0.05, 0.18,
                0.15, 0.28,
                0.3, 0.35,
                0.5, 0.40,
                0.8, 0.45,
                1.2, 0.50,
                2.0, 0.55,
                5.0, 0.60,
              ],
            },
          }, beforeLayer);
        }

        // --- Snowfall rate labels ---
        const snowLabels = buildSnowfallLabelsGeoJSON(gridData.points);
        addOrUpdateSource(map!, SNOW_LABELS_SOURCE, snowLabels);

        if (!map!.getLayer(SNOW_LABELS_LAYER)) {
          map!.addLayer({
            id: SNOW_LABELS_LAYER,
            type: 'symbol',
            source: SNOW_LABELS_SOURCE,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 11,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-padding': 8,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(30,58,95,0.85)',
              'text-halo-width': 1.5,
            },
          });
        }

        // --- Snow level label ---
        const snowLevelGeoJSON = buildSnowLevelGeoJSON(gridData.points);
        addOrUpdateSource(map!, SNOW_LEVEL_SOURCE, snowLevelGeoJSON);

        if (!map!.getLayer(SNOW_LEVEL_LAYER)) {
          map!.addLayer({
            id: SNOW_LEVEL_LAYER,
            type: 'symbol',
            source: SNOW_LEVEL_SOURCE,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 13,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'center',
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': '#1e3a5f',
              'text-halo-color': 'rgba(255,255,255,0.9)',
              'text-halo-width': 2,
            },
          });
        }
      } else {
        // Remove precip layers if precip is off
        for (const id of [PRECIP_LAYER, SNOW_LABELS_LAYER, SNOW_LEVEL_LAYER]) {
          if (map!.getLayer(id)) map!.removeLayer(id);
        }
        for (const id of [PRECIP_SOURCE, SNOW_LABELS_SOURCE, SNOW_LEVEL_SOURCE]) {
          if (map!.getSource(id)) map!.removeSource(id);
        }
      }

      // --- Dense wind arrow field across the grid area ---
      if (showWind) {
        // Generate arrow icon as SDF image if not already added
        if (!map!.hasImage('wind-arrow')) {
          const size = 32;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          // Draw upward-pointing arrow (rotation handled by icon-rotate)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(size / 2, 2);           // top center (tip)
          ctx.lineTo(size - 6, size - 4);    // bottom right
          ctx.lineTo(size / 2, size - 10);   // notch center
          ctx.lineTo(6, size - 4);           // bottom left
          ctx.closePath();
          ctx.fill();
          const data = ctx.getImageData(0, 0, size, size);
          map!.addImage('wind-arrow', data, { sdf: true });
        }

        const windGeoJSON = buildWindFieldGeoJSON(gridData.points);
        addOrUpdateSource(map!, WIND_LABELS_SOURCE, windGeoJSON);

        if (!map!.getLayer(WIND_ARROWS_LAYER)) {
          map!.addLayer({
            id: WIND_ARROWS_LAYER,
            type: 'symbol',
            source: WIND_LABELS_SOURCE,
            layout: {
              'icon-image': 'wind-arrow',
              'icon-size': [
                'interpolate', ['linear'], ['get', 'ridge_mph'],
                0, 0.4,
                15, 0.6,
                25, 0.8,
                40, 1.0,
              ],
              'icon-rotation-alignment': 'map',
              // Arrow points in the direction wind is blowing TO
              // (wind_direction is where it comes FROM, so add 180)
              'icon-rotate': ['+', ['get', 'wind_direction'], 180],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-padding': 0,
            },
            paint: {
              'icon-color': [
                'interpolate', ['linear'], ['get', 'ridge_mph'],
                0,  '#93C5FD',   // blue-300 — calm
                10, '#3B82F6',   // blue-500 — light
                15, '#F59E0B',   // amber-500 — moderate
                25, '#EF4444',   // red-500 — strong
                40, '#991B1B',   // red-800 — extreme
              ],
              'icon-opacity': [
                'interpolate', ['linear'], ['get', 'ridge_mph'],
                0, 0.5,
                10, 0.7,
                20, 0.85,
                30, 1.0,
              ],
            },
          });
        }

        // No separate text label layer — the dense arrows convey direction
        // and intensity visually without cluttering the map
      } else {
        // Remove wind layers if wind is off
        for (const id of [WIND_ARROWS_LAYER, WIND_LABELS_LAYER]) {
          if (map!.getLayer(id)) map!.removeLayer(id);
        }
        if (map!.getSource(WIND_LABELS_SOURCE)) map!.removeSource(WIND_LABELS_SOURCE);
      }
    }

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('styledata', apply);
    }

    return () => {
      map.off('styledata', apply);
    };
  }, [map, showPrecip, showWind, gridData]);

  // Clean up all layers on unmount only
  useEffect(() => {
    return () => {
      if (map) removeAll(map);
    };
  }, [map]);

  // --- Legend ---
  if (!showPrecip && !showWind) return null;

  // Loading / error states
  if (isLoading) {
    return (
      <div className="absolute bottom-[calc(30dvh+10rem)] left-3 z-10 rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm md:bottom-12">
        <div className="flex items-center gap-2 text-[11px] text-gray-300">
          <div className="h-3 w-3 animate-spin rounded-full border border-gray-500 border-t-white" />
          Loading weather grid…
        </div>
      </div>
    );
  }

  if (isError || !gridData) {
    return (
      <div className="absolute bottom-[calc(30dvh+10rem)] left-3 z-10 rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm md:bottom-12">
        <div className="text-[11px] text-red-400">Weather data unavailable</div>
      </div>
    );
  }

  const snowPoints = gridData.points.filter((p) => p.snowfall > 0);
  const rainPoints = gridData.points.filter((p) => p.precipitation > 0 && p.snowfall === 0);
  const hasSnow = snowPoints.length > 0;
  const hasRain = rainPoints.length > 0;

  const precipPoints = gridData.points.filter((p) => p.precipitation > 0 || p.snowfall > 0);
  const avgFreezingLevel =
    precipPoints.length > 0
      ? Math.round(precipPoints.reduce((sum, p) => sum + p.freezing_level_height, 0) / precipPoints.length)
      : null;

  return (
    <div className="absolute bottom-[calc(30dvh+10rem)] left-3 z-10 rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm md:bottom-12">
      {showPrecip && (
        <>
          {avgFreezingLevel !== null && (
            <div className="mb-2 flex items-center gap-1.5 border-b border-white/20 pb-2 text-[11px] font-medium">
              <span>❄️</span>
              <span>Snow level: ~{metersToFeet(avgFreezingLevel).toLocaleString()}&apos;</span>
            </div>
          )}

          {hasSnow && (
            <div className="mb-1.5">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-blue-300">Snow</div>
              <div
                className="h-2.5 w-24 rounded-sm"
                style={{ background: 'linear-gradient(to right, rgba(186,230,253,0.28), rgba(56,189,248,0.40), rgba(2,132,199,0.50), rgba(7,89,133,0.55), rgba(136,19,220,0.60))' }}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-400" style={{ width: '6rem' }}>
                <span>Light</span>
                <span>Heavy</span>
              </div>
            </div>
          )}

          {hasRain && (
            <div className={showWind ? 'mb-1.5' : ''}>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-green-300">Rain</div>
              <div
                className="h-2.5 w-24 rounded-sm"
                style={{ background: 'linear-gradient(to right, rgba(74,222,128,0.25), rgba(250,204,21,0.4), rgba(251,146,60,0.5), rgba(239,68,68,0.58))' }}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-400" style={{ width: '6rem' }}>
                <span>Light</span>
                <span>Heavy</span>
              </div>
            </div>
          )}

          {!hasSnow && !hasRain && (
            <div className={`text-[11px] text-gray-400${showWind ? ' mb-1.5' : ''}`}>No active precipitation</div>
          )}
        </>
      )}

      {showWind && (
        <div className={showPrecip ? 'border-t border-white/20 pt-1.5' : ''}>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-300">Wind (ridge)</div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span style={{ color: '#93C5FD' }}>→</span><span className="text-gray-400">Calm</span>
            <span style={{ color: '#F59E0B' }}>→</span><span className="text-gray-400">Moderate</span>
            <span style={{ color: '#EF4444' }}>→</span><span className="text-gray-400">Strong</span>
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
