'use client';

import { useEffect, useMemo } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { isStyleReady } from '@/lib/mapStyle';
import { getSunPosition } from '@/lib/analysis/solar';

/**
 * Sun exposure overlay using a dynamic hillshade layer.
 *
 * Illumination direction tracks the sun's computed azimuth for the selected
 * forecast hour (or current time). Sun-facing slopes show warm golden highlights,
 * shaded slopes show cool blue. Exaggeration scales with sun elevation angle —
 * low sun → deep shadows, high sun → even illumination.
 *
 * Uses its own raster-dem source (separate from main terrain + aspect) to avoid
 * interference with other DEM-dependent features.
 */

const SOURCE_ID = 'sun-terrain-source';
const LAYER_ID = 'sun-exposure-layer';

/** Lake Tahoe center — constant for sun position calculation. */
const TAHOE_LAT = 39.0968;
const TAHOE_LNG = -120.0324;

function removeAll(map: mapboxgl.Map) {
  try {
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // map may be torn down
  }
}

/** Compass direction label from azimuth degrees. */
function azimuthToCompass(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(az / 45) % 8];
}

/** Compute the Date for the selected forecast hour or now. */
function getForecastDate(hour: number | null): Date {
  if (hour == null) return new Date();

  // Forecast hour 0 = midnight today in Pacific time.
  // Construct midnight in local (Pacific) time, then add hours.
  const now = new Date();
  const pacific = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  // pacific is "MM/DD/YYYY"
  const [m, d, y] = pacific.split('/');
  // Dynamically resolve the Pacific offset for the target date (PST=-8, PDT=-7)
  const targetNoon = new Date(`${y}-${m}-${d}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'shortOffset',
  });
  const tzPart = formatter.formatToParts(targetNoon).find(p => p.type === 'timeZoneName');
  const offsetHours = parseInt(tzPart?.value?.replace('GMT', '') ?? '-8', 10);
  const offsetStr = `${offsetHours < 0 ? '-' : '+'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  const midnight = new Date(`${y}-${m}-${d}T00:00:00${offsetStr}`);
  return new Date(midnight.getTime() + hour * 3600000);
}

export function SunExposureOverlay({ map }: { map: mapboxgl.Map | null }) {
  const showSunExposure = useMapStore((s) => s.showSunExposure);
  const selectedForecastHour = useMapStore((s) => s.selectedForecastHour);

  const sunDate = useMemo(
    () => getForecastDate(selectedForecastHour),
    [selectedForecastHour],
  );
  const sun = useMemo(
    () => getSunPosition(sunDate, TAHOE_LAT, TAHOE_LNG),
    [sunDate],
  );

  const isNight = sun.elevation <= 0;

  // Map hillshade exaggeration to sun elevation:
  // Low sun (5-10°) → max shadows (1.0), high sun (60°+) → strong (0.8)
  const exaggeration = isNight
    ? 0.8
    : Math.max(0.8, Math.min(1.0, 1.0 - (sun.elevation / 60) * 0.2));

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!isStyleReady(map!)) return;

      if (!showSunExposure) {
        removeAll(map!);
        return;
      }

      // Add DEM source if missing
      if (!map!.getSource(SOURCE_ID)) {
        map!.addSource(SOURCE_ID, {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      const beforeLayer =
        map!.getLayer('selected-tour-route-casing')
          ? 'selected-tour-route-casing'
          : map!.getLayer('tour-markers-layer')
            ? 'tour-markers-layer'
            : undefined;

      if (!map!.getLayer(LAYER_ID)) {
        map!.addLayer(
          {
            id: LAYER_ID,
            type: 'hillshade',
            source: SOURCE_ID,
            paint: {
              'hillshade-illumination-direction': sun.azimuth,
              'hillshade-illumination-anchor': 'map',
              'hillshade-exaggeration': exaggeration,
              'hillshade-highlight-color': isNight
                ? 'rgba(100, 130, 180, 0.35)'
                : 'rgba(255, 200, 50, 1.0)',
              'hillshade-shadow-color': isNight
                ? 'rgba(10, 15, 40, 0.85)'
                : 'rgba(20, 30, 80, 0.95)',
              'hillshade-accent-color': 'rgba(0,0,0,0.25)',
            },
          },
          beforeLayer,
        );
      } else {
        // Update paint properties without removing the layer
        map!.setPaintProperty(LAYER_ID, 'hillshade-illumination-direction', sun.azimuth);
        map!.setPaintProperty(LAYER_ID, 'hillshade-exaggeration', exaggeration);
        map!.setPaintProperty(
          LAYER_ID,
          'hillshade-highlight-color',
          isNight ? 'rgba(100, 130, 180, 0.35)' : 'rgba(255, 200, 50, 1.0)',
        );
        map!.setPaintProperty(
          LAYER_ID,
          'hillshade-shadow-color',
          isNight ? 'rgba(10, 15, 40, 0.85)' : 'rgba(20, 30, 80, 0.95)',
        );
      }
    }

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    function tryApply() {
      if (cancelled) return;
      if (isStyleReady(map!)) { apply(); } else { retryTimer = setTimeout(tryApply, 50); }
    }
    tryApply();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      removeAll(map);
    };
  }, [map, showSunExposure, sun.azimuth, exaggeration, isNight]);

  return null;
}
