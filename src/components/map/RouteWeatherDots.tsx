'use client';

import { useEffect, useMemo, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { useGridPrecip } from '@/hooks/useGridPrecip';
import type { GridBbox } from '@/hooks/useGridPrecip';
import type { GridPrecipPoint } from '@/lib/types/conditions';
import { kmhToMph, windDegreesToCompass, celsiusToFahrenheit, metersToFeet } from '@/lib/types/conditions';
import { useWeather, getCurrentHour } from '@/hooks/useWeather';
import type { Tour } from '@/lib/types/tour';
import { tours } from '@/data/tours';

const DOTS_SOURCE = 'route-weather-dots-source';
const DOTS_LAYER = 'route-weather-dots-layer';
const LABELS_SOURCE = 'route-weather-labels-source';
const LABELS_LAYER = 'route-weather-labels-layer';
const ARROWS_SOURCE = 'route-weather-arrows-source';
const ARROWS_LAYER = 'route-weather-arrows-layer';

const ALL_LAYERS = [LABELS_LAYER, ARROWS_LAYER, DOTS_LAYER];
const ALL_SOURCES = [LABELS_SOURCE, ARROWS_SOURCE, DOTS_SOURCE];

/** ~2 miles in degrees latitude. */
const BUFFER_DEG = 0.03;

/**
 * Sample spacing in meters scales with zoom level.
 * At high zoom (≥14) we show dense points (200m apart).
 * At low zoom (≤10) we show sparse points (~1600m apart).
 * This prevents labels from overlapping into an unreadable mess when zoomed out.
 */
function spacingForZoom(zoom: number): number {
  if (zoom >= 14) return 200;
  if (zoom <= 10) return 1600;
  // Linear interpolation between zoom 10-14
  const t = (zoom - 10) / 4;
  return Math.round(1600 - t * 1400);
}

/** Haversine distance between two [lng, lat] points in meters. */
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Sample points along a coordinate array at approximately `spacingM` intervals. */
function sampleRoute(coords: [number, number][], spacingM: number): [number, number][] {
  if (coords.length === 0) return [];

  const samples: [number, number][] = [coords[0]];
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    accumulated += haversineM(coords[i - 1], coords[i]);
    if (accumulated >= spacingM) {
      samples.push(coords[i]);
      accumulated = 0;
    }
  }

  // Always include the last point (summit)
  const last = coords[coords.length - 1];
  const lastSample = samples[samples.length - 1];
  if (last[0] !== lastSample[0] || last[1] !== lastSample[1]) {
    samples.push(last);
  }

  return samples;
}

/** Find the nearest grid point to a given [lng, lat]. */
function findNearest(lng: number, lat: number, grid: GridPrecipPoint[]): GridPrecipPoint | null {
  if (grid.length === 0) return null;

  let best = grid[0];
  let bestDist = (grid[0].reqLng - lng) ** 2 + (grid[0].reqLat - lat) ** 2;

  for (let i = 1; i < grid.length; i++) {
    const d = (grid[i].reqLng - lng) ** 2 + (grid[i].reqLat - lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = grid[i];
    }
  }

  return best;
}

/** Compute a bounding box around route coordinates with a buffer. */
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
 * Stub tour used when no tour is selected, to satisfy useWeather's
 * required param without conditionally calling the hook.
 */
const STUB_TOUR: Tour = {
  slug: '',
  name: '',
  description: '',
  difficulty: 'beginner',
  ates_rating: 'simple',
  distance_km: 0,
  elevation_gain_m: 0,
  elevation_loss_m: 0,
  max_elevation_m: 0,
  min_elevation_m: 0,
  estimated_hours_range: [0, 0],
  transition_count: 0,
  terrain_traps: [],
  overhead_hazards: [],
  escape_routes: [],
  avy_center_id: '',
  trailhead: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
  nearest_snotel: [],
  parking: { capacity: '', fills_by: '', permit: '', notes: '' },
  seasonal_notes: '',
  cell_coverage: '',
  sar_jurisdiction: '',
  variants: [],
};

export function RouteWeatherDots({ map }: { map: mapboxgl.Map | null }) {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);
  const showWind = useMapStore((s) => s.showWind);
  const selectedVariantIndex = useMapStore((s) => s.selectedVariantIndex);

  // Track map zoom to adjust sample density.
  // Uses a ref (not state) so the main effect dep array stays fixed size.
  // A separate zoomend listener calls applyRef.current to re-sample at new spacing.
  const zoomRef = useRef(map?.getZoom() ?? 13);
  const applyRef = useRef<(() => void) | null>(null);

  const tour = useMemo(
    () => (selectedTourSlug ? tours.find((t) => t.slug === selectedTourSlug) ?? null : null),
    [selectedTourSlug],
  );

  const bbox = useMemo(
    () => (selectedTourSlug ? computeRouteBbox(selectedTourSlug) : null),
    [selectedTourSlug],
  );

  const setLayerLoading = useMapStore((s) => s.setLayerLoading);

  const { data: gridData, isFetching } = useGridPrecip(bbox, selectedForecastHour, !!selectedTourSlug);

  // Report fetching state for the route weather layer
  useEffect(() => {
    setLayerLoading('routeWeather', isFetching);
    return () => { setLayerLoading('routeWeather', false); };
  }, [isFetching, setLayerLoading]);

  // useWeather needs a Tour — pass the real tour or a stub to avoid conditional hook calls
  const { data: forecast } = useWeather(tour ?? STUB_TOUR);

  // Get temperature for the selected or current hour from the tour forecast
  const hourData = useMemo(() => {
    if (!forecast || !tour) return null;
    if (selectedForecastHour != null && forecast.hourly[selectedForecastHour]) {
      return forecast.hourly[selectedForecastHour];
    }
    return getCurrentHour(forecast);
  }, [forecast, tour, selectedForecastHour]);

  const tempF = hourData ? Math.round(celsiusToFahrenheit(hourData.temperature_2m)) : null;

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!map!.isStyleLoaded()) return;
      // Store latest apply so the zoomend listener can call it
      applyRef.current = apply;

      if (!tour) {
        removeAll(map!);
        return;
      }

      // Wait for grid data to load — don't tear down existing layers
      if (!gridData || gridData.points.length === 0) return;

      // Sample the selected variant's skin-up route only
      const variant = tour.variants[selectedVariantIndex] ?? tour.variants[0];
      if (!variant) {
        removeAll(map!);
        return;
      }
      const coords = variant.route.geometry.coordinates as [number, number][];
      if (coords.length < 2) {
        removeAll(map!);
        return;
      }

      const samples = sampleRoute(coords, spacingForZoom(zoomRef.current));
      const grid = gridData.points;

      // Build GeoJSON features for dots, labels, and wind arrows
      const dotFeatures: GeoJSON.Feature[] = [];
      const labelFeatures: GeoJSON.Feature[] = [];
      const arrowFeatures: GeoJSON.Feature[] = [];

      for (let si = 0; si < samples.length; si++) {
        const [lng, lat] = samples[si];
        const nearest = findNearest(lng, lat, grid);
        if (!nearest) continue;

        // Every other dot gets a label; the rest are just dots.
        // First and last points always get labels (trailhead + summit).
        const showLabel = si === 0 || si === samples.length - 1 || si % 2 === 0;

        // Convert units: snowfall cm → in, wind km/h → mph
        // Guard against null/undefined from Open-Meteo
        const windMph = kmhToMph(nearest.wind_speed_10m ?? 0);

        dotFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {},
        });

        if (showLabel) {
          const snowfall48hIn = Math.round((nearest.snowfall_48h ?? 0) / 2.54);
          const snowfallCm = nearest.snowfall ?? 0;
          const snowfallInHr = snowfallCm / 2.54;
          const precipMm = nearest.precipitation ?? 0;
          const windDir = windDegreesToCompass(nearest.wind_direction_10m ?? 0);
          const elevFt = metersToFeet(nearest.elevation ?? 0);
          const elevStr = elevFt >= 1000 ? `${(elevFt / 1000).toFixed(1)}k'` : `${elevFt}'`;

          // Classify precip type using same logic as PrecipOverlay fill layer:
          // snow when snowfall dominates, rain when precipitation dominates
          const isSnow = snowfallCm > precipMm * 0.1;
          const isActivePrecip = snowfallCm > 0.01 || precipMm > 0.1;

          // Build compact label text
          // Line 1: elevation + 48h snowfall + current rate (if active) + temperature
          // Line 2: wind direction + speed
          let snowLine: string;
          if (isActivePrecip && isSnow) {
            snowLine = `${snowfall48hIn}″ 48h · ❄ ${snowfallInHr.toFixed(1)}″/hr`;
          } else if (isActivePrecip && !isSnow) {
            snowLine = snowfall48hIn > 0
              ? `${snowfall48hIn}″ 48h · 🌧 rain`
              : `🌧 ${(precipMm / 25.4).toFixed(2)}″/hr`;
          } else {
            snowLine = snowfall48hIn > 0 ? `${snowfall48hIn}″ 48h` : 'No new snow';
          }
          const tempStr = tempF != null ? `${tempF}°F` : '';
          const windLine = `${windDir} ${windMph} mph${tempStr ? `  ${tempStr}` : ''}`;
          snowLine = `${elevStr}  ${snowLine}`;

          labelFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { label: `${snowLine}\n${windLine}` },
          });
        }

        arrowFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            wind_direction: nearest.wind_direction_10m ?? 0,
            wind_mph: windMph,
          },
        });
      }

      const dotsGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: dotFeatures };
      const labelsGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: labelFeatures };
      const arrowsGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: arrowFeatures };

      // Ensure wind-arrow SDF icon exists for wind direction markers
      if (!map!.hasImage('wind-arrow')) {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(size / 2, 2);
        ctx.lineTo(size - 6, size - 4);
        ctx.lineTo(size / 2, size - 10);
        ctx.lineTo(6, size - 4);
        ctx.closePath();
        ctx.fill();
        const data = ctx.getImageData(0, 0, size, size);
        map!.addImage('wind-arrow', data, { sdf: true });
      }

      // Update source data (or create sources if they don't exist yet).
      // Layers are added only once; subsequent updates just swap the source data
      // so the map doesn't flash from layer removal/re-addition.
      addOrUpdateSource(map!, DOTS_SOURCE, dotsGeoJSON);
      addOrUpdateSource(map!, LABELS_SOURCE, labelsGeoJSON);
      addOrUpdateSource(map!, ARROWS_SOURCE, arrowsGeoJSON);

      // --- Dot circles ---
      // minzoom prevents route weather data from showing at overview zoom levels
      // where it would be unreadable and confusing (e.g. if fitBounds hasn't fired yet)
      if (!map!.getLayer(DOTS_LAYER)) {
        map!.addLayer({
          id: DOTS_LAYER,
          type: 'circle',
          source: DOTS_SOURCE,
          minzoom: 10.5,
          paint: {
            'circle-radius': 4,
            'circle-color': '#ffffff',
            'circle-stroke-color': '#1e3a5f',
            'circle-stroke-width': 1.5,
          },
        });
      }

      // --- Wind direction arrows (hidden when grid wind overlay is active to avoid conflicting arrows) ---
      if (!showWind) {
        if (!map!.getLayer(ARROWS_LAYER)) {
          map!.addLayer({
            id: ARROWS_LAYER,
            type: 'symbol',
            source: ARROWS_SOURCE,
            minzoom: 10.5,
            layout: {
              'icon-image': 'wind-arrow',
              'icon-size': 0.45,
              'icon-rotation-alignment': 'map',
              // Arrow points in the direction wind blows TO (from + 180)
              'icon-rotate': ['+', ['get', 'wind_direction'], 180],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-offset': [-20, 0],
              'icon-anchor': 'right',
            },
            paint: {
              'icon-color': [
                'interpolate',
                ['linear'],
                ['get', 'wind_mph'],
                0, '#93C5FD',   // blue-300 — calm
                10, '#3B82F6',  // blue-500 — light
                15, '#F59E0B',  // amber-500 — moderate
                25, '#EF4444',  // red-500 — strong
                40, '#991B1B',  // red-800 — extreme
              ],
              'icon-halo-color': 'rgba(255,255,255,0.7)',
              'icon-halo-width': 1,
            },
          });
        }
      } else if (map!.getLayer(ARROWS_LAYER)) {
        // Wind overlay active — hide route-level arrows to avoid conflict
        map!.removeLayer(ARROWS_LAYER);
      }

      // --- Text labels (precip + temp + wind) ---
      if (!map!.getLayer(LABELS_LAYER)) {
        map!.addLayer({
          id: LABELS_LAYER,
          type: 'symbol',
          source: LABELS_SOURCE,
          minzoom: 10.5,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 14,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-anchor': 'left',
            'text-offset': [1, 0],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-padding': 4,
            'text-max-width': 20,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(30,58,95,0.9)',
            'text-halo-width': 1.5,
          },
        });
      }
    }

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('styledata', apply);
    }

    // Re-raise route dots above any layers other overlays may have added after us.
    // Uses requestAnimationFrame so it runs after all synchronous React effects.
    const raf = requestAnimationFrame(() => {
      if (!map.isStyleLoaded()) return;
      try {
        for (const id of ALL_LAYERS) {
          if (map.getLayer(id)) map.moveLayer(id);
        }
      } catch {
        // Layer may have been removed
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      map.off('styledata', apply);
    };
  }, [map, tour, gridData, tempF, showWind, selectedVariantIndex]);

  // Re-sample dots when zoom changes (adjusts density for readability)
  useEffect(() => {
    if (!map) return;
    zoomRef.current = map.getZoom();
    const handler = () => {
      zoomRef.current = map.getZoom();
      applyRef.current?.();
    };
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  // Clean up all layers on unmount only
  useEffect(() => {
    return () => {
      if (map) removeAll(map);
    };
  }, [map]);

  return null;
}
