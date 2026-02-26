'use client';

import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { isStyleReady } from '@/lib/mapStyle';

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
      if (!isStyleReady(map!)) return;

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
  }, [map, showTreeCover]);

  return null;
}
