'use client';

import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { useAvyForecast } from '@/hooks/useAvyForecast';
import { AspectElevationRose, parseLocations } from '@/components/tour/AvyDangerBanner';

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
  const { data: avyData } = useAvyForecast();

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!map!.isStyleLoaded()) return;

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

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('styledata', apply);
    }

    return () => {
      map.off('styledata', apply);
      removeAll(map);
    };
  }, [map, showAspect]);

  // Legend
  if (!showAspect) return null;

  // Colors matching the layer config (0.8 opacity for legend)
  const N_COLOR = 'rgba(234,179,8,0.85)';    // yellow
  const E_COLOR = 'rgba(59,130,246,0.85)';   // blue
  const S_COLOR = 'rgba(168,85,247,0.85)';   // purple
  const W_COLOR = 'rgba(239,68,68,0.85)';    // red

  const problems = avyData?.detailed?.problems ?? [];

  return (
    <div className="rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Slope Aspect
      </div>
      {/* Compass rose with colored directional tips */}
      <svg viewBox="0 0 100 100" width="90" height="90" className="mx-auto">
        {/* N tip (up) */}
        <polygon points="50,8 42,42 50,38 58,42" fill={N_COLOR} />
        {/* S tip (down) */}
        <polygon points="50,92 42,58 50,62 58,58" fill={S_COLOR} />
        {/* E tip (right) */}
        <polygon points="92,50 58,42 62,50 58,58" fill={E_COLOR} />
        {/* W tip (left) */}
        <polygon points="8,50 42,42 38,50 42,58" fill={W_COLOR} />
        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="rgba(255,255,255,0.5)" />
        {/* Cardinal labels */}
        <text x="50" y="6" textAnchor="middle" fill={N_COLOR} fontSize="9" fontWeight="700">N</text>
        <text x="50" y="99" textAnchor="middle" fill={S_COLOR} fontSize="9" fontWeight="700">S</text>
        <text x="97" y="53" textAnchor="end" fill={E_COLOR} fontSize="9" fontWeight="700">E</text>
        <text x="3" y="53" textAnchor="start" fill={W_COLOR} fontSize="9" fontWeight="700">W</text>
      </svg>

      {/* Avy problem roses — shown when forecast data exists */}
      {problems.length > 0 && (
        <div className="mt-2 border-t border-white/20 pt-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-300">
            Avy Problem Aspects
          </div>
          <div className="space-y-2">
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
        </div>
      )}

      <div className="mt-1 border-t border-white/20 pt-1 text-[9px] text-gray-500">
        Flat terrain appears unshaded
      </div>
    </div>
  );
}
