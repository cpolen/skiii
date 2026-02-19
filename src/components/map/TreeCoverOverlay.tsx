'use client';

import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';

/**
 * Tree canopy cover overlay using NLCD Tree Canopy Cover data (30m resolution).
 *
 * Fetches pre-styled WMS tiles directly from the MRLC GeoServer — no proxy
 * needed. The WMS returns green-shaded imagery where darker green = denser
 * canopy. Transparent where no trees exist.
 *
 * Layer: mrlc_display:nlcd_tcc_conus_2021_v2021-4 (2021 vintage, CONUS)
 *
 * Useful for backcountry skiing: dense tree cover provides wind/precip
 * protection and reduces avalanche exposure on treed slopes.
 */

const SOURCE_ID = 'tree-cover-tiles';
const LAYER_ID = 'tree-cover-layer';

/** MRLC WMS tile URL — Mapbox substitutes {bbox-epsg-3857} at render time. */
const WMS_URL =
  'https://www.mrlc.gov/geoserver/NLCD_Canopy/wms?service=WMS&version=1.1.1&request=GetMap' +
  '&layers=mrlc_display:nlcd_tcc_conus_2021_v2021-4' +
  '&bbox={bbox-epsg-3857}' +
  '&width=256&height=256' +
  '&srs=EPSG:3857' +
  '&format=image/png' +
  '&transparent=true';

function removeAll(map: mapboxgl.Map) {
  try {
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // map may be torn down
  }
}

export function TreeCoverOverlay({ map }: { map: mapboxgl.Map | null }) {
  const showTreeCover = useMapStore((s) => s.showTreeCover);

  useEffect(() => {
    if (!map) return;

    function apply() {
      if (!map!.isStyleLoaded()) return;

      if (!showTreeCover) {
        removeAll(map!);
        return;
      }

      if (!map!.getSource(SOURCE_ID)) {
        map!.addSource(SOURCE_ID, {
          type: 'raster',
          tiles: [WMS_URL],
          tileSize: 256,
        });
      }

      // Insert below route lines so they stay visible
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
            type: 'raster',
            source: SOURCE_ID,
            paint: {
              'raster-opacity': 0.6,
            },
          },
          beforeLayer,
        );
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
  }, [map, showTreeCover]);

  if (!showTreeCover) return null;

  // Legend — matches the MRLC default green ramp
  const ranges = [
    { label: 'Sparse', color: 'rgba(200, 230, 190, 0.8)' },
    { label: 'Light', color: 'rgba(140, 200, 120, 0.85)' },
    { label: 'Dense', color: 'rgba(70, 150, 50, 0.9)' },
    { label: 'Thick', color: 'rgba(30, 100, 20, 0.95)' },
  ];

  return (
    <div className="rounded-lg bg-gray-900/85 px-3 py-2.5 text-xs text-white shadow-lg backdrop-blur-sm">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-300">
        Tree Canopy Cover
      </div>
      <div className="flex gap-0.5">
        {ranges.map((r) => (
          <div key={r.label} className="flex flex-col items-center">
            <div
              className="h-3 w-6 rounded-sm"
              style={{ background: r.color }}
            />
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
