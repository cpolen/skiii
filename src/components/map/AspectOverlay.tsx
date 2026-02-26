'use client';

import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { isStyleReady } from '@/lib/mapStyle';

/**
 * Aspect overlay using four stacked hillshade layers, each illuminated from a
 * cardinal direction and colored to indicate the slope aspect it highlights.
 *
 * Color convention (standard avalanche / backcountry mapping):
 *   N  = Yellow (cold, shaded, persistent slabs)
 *   E  = Blue   (morning sun)
 *   S  = Purple (warm, sun-affected)
 *   W  = Red    (afternoon sun)
 *
 * Each hillshade layer's `hillshade-illumination-direction` is set so that the
 * highlight color paints slopes FACING that direction.
 * The illumination-direction is the azimuth the light comes FROM, so slopes
 * facing that direction are in highlight. Slopes facing away are in shadow.
 * We make the shadow transparent so only the highlighted aspect shows through.
 */

const ASPECT_SOURCE = 'aspect-terrain-source';

/** One layer per cardinal direction. */
const ASPECT_LAYERS = [
  { id: 'aspect-north', azimuth: 0, color: 'rgba(234,179,8,1)' },       // yellow-500
  { id: 'aspect-east', azimuth: 90, color: 'rgba(59,130,246,1)' },      // blue-500
  { id: 'aspect-south', azimuth: 180, color: 'rgba(168,85,247,1)' },    // purple-500
  { id: 'aspect-west', azimuth: 270, color: 'rgba(239,68,68,1)' },     // red-500
] as const;

function removeAll(map: mapboxgl.Map) {
  try {
    for (const l of ASPECT_LAYERS) {
      if (map.getLayer(l.id)) map.removeLayer(l.id);
    }
    if (map.getSource(ASPECT_SOURCE)) map.removeSource(ASPECT_SOURCE);
  } catch {
    // map may be torn down
  }
}

export function AspectOverlay({ map }: { map: mapboxgl.Map | null }) {
  const showAspect = useMapStore((s) => s.showAspect);

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!isStyleReady(map!)) return;

      if (!showAspect) {
        removeAll(map!);
        return;
      }

      // Add a dedicated raster-dem source for the aspect hillshade layers.
      // We use a separate source from the main terrain so toggling aspect
      // doesn't interfere with 3D terrain or the slope-angle hillshade.
      if (!map!.getSource(ASPECT_SOURCE)) {
        map!.addSource(ASPECT_SOURCE, {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }

      const beforeLayer = map!.getLayer('tour-markers-layer')
        ? 'tour-markers-layer'
        : undefined;

      for (const l of ASPECT_LAYERS) {
        if (!map!.getLayer(l.id)) {
          map!.addLayer(
            {
              id: l.id,
              type: 'hillshade',
              source: ASPECT_SOURCE,
              paint: {
                'hillshade-illumination-direction': l.azimuth,
                'hillshade-illumination-anchor': 'map',
                'hillshade-exaggeration': 0.8,
                // Highlight = slopes facing toward the light (this aspect)
                'hillshade-highlight-color': l.color,
                // Shadow = slopes facing away — make transparent
                'hillshade-shadow-color': 'rgba(0,0,0,0)',
                // Accent = steep cliffs — subtle gray
                'hillshade-accent-color': 'rgba(0,0,0,0.08)',
              },
            },
            beforeLayer,
          );
        }
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
  }, [map, showAspect]);

  return null;
}
