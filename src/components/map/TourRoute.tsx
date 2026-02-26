'use client';

import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { isStyleReady } from '@/lib/mapStyle';
import { tours } from '@/data/tours';

/**
 * Renders the selected tour's route(s) on the map.
 *
 * When a variant has a `ski_route`, two lines are drawn:
 *   Skin up  → green dashed line with direction arrows
 *   Ski down → orange solid line with direction arrows
 *
 * When there's no `ski_route`, a single blue line is drawn (legacy behavior).
 *
 * Direction arrows are rendered as a symbol layer using Mapbox's built-in
 * `arrow` SDF icon placed along the line geometry.
 */

const SOURCE_ID = 'selected-tour-route';
const CASING_ID = 'selected-tour-route-casing';
const LINE_ID = 'selected-tour-route-line';
const ARROWS_ID = 'selected-tour-route-arrows';

const SKI_SOURCE_ID = 'selected-tour-ski-route';
const SKI_CASING_ID = 'selected-tour-ski-casing';
const SKI_LINE_ID = 'selected-tour-ski-line';
const SKI_ARROWS_ID = 'selected-tour-ski-arrows';

const ALL_LAYERS = [ARROWS_ID, LINE_ID, CASING_ID, SKI_ARROWS_ID, SKI_LINE_ID, SKI_CASING_ID];
const ALL_SOURCES = [SOURCE_ID, SKI_SOURCE_ID];

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

/** Generate a small triangle SDF image for direction arrows. */
function ensureArrowImage(map: mapboxgl.Map) {
  if (map.hasImage('route-arrow')) return;
  const size = 20;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 3, size - 2);
  ctx.lineTo(size / 2, size - 6);
  ctx.lineTo(3, size - 2);
  ctx.closePath();
  ctx.fill();
  const data = ctx.getImageData(0, 0, size, size);
  map.addImage('route-arrow', data, { sdf: true });
}

export function TourRoute({ map }: { map: mapboxgl.Map | null }) {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const selectedVariantIndex = useMapStore((s) => s.selectedVariantIndex);

  useEffect(() => {
    if (!map) return;

    function apply() {
      // We only need the style definition to be parsed — not all tiles loaded.
      // getStyle() returns undefined when the style hasn't loaded yet.
      if (!isStyleReady(map!)) return;

      removeAll(map!);

      const tour = selectedTourSlug ? tours.find((t) => t.slug === selectedTourSlug) : null;
      if (!tour) return;

      const variant = tour.variants[selectedVariantIndex] ?? tour.variants[0];
      if (!variant) return;

      const beforeLayer = map!.getLayer('tour-markers-layer') ? 'tour-markers-layer' : undefined;
      const hasSkiRoute = !!variant.ski_route;

      // --- Skin / primary route ---
      const skinColor = hasSkiRoute ? '#22C55E' : '#3B82F6';
      const skinCasing = hasSkiRoute ? '#14532d' : '#1e3a5f';

      map!.addSource(SOURCE_ID, { type: 'geojson', data: variant.route });

      map!.addLayer(
        {
          id: CASING_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: { 'line-color': skinCasing, 'line-width': 6, 'line-opacity': 0.35 },
          layout: { 'line-cap': hasSkiRoute ? 'butt' : 'round', 'line-join': 'round' },
        },
        beforeLayer,
      );

      map!.addLayer(
        {
          id: LINE_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': skinColor,
            'line-width': 3,
            ...(hasSkiRoute ? { 'line-dasharray': [3, 2] } : {}),
          },
          layout: { 'line-cap': hasSkiRoute ? 'butt' : 'round', 'line-join': 'round' },
        },
        beforeLayer,
      );

      // Direction arrows along skin route
      if (hasSkiRoute) {
        ensureArrowImage(map!);
        map!.addLayer(
          {
            id: ARROWS_ID,
            type: 'symbol',
            source: SOURCE_ID,
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': 80,
              'icon-image': 'route-arrow',
              'icon-size': 0.55,
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
            paint: { 'icon-color': skinColor, 'icon-opacity': 0.9 },
          },
          beforeLayer,
        );
      }

      // --- Ski route (if present) ---
      if (hasSkiRoute && variant.ski_route) {
        map!.addSource(SKI_SOURCE_ID, { type: 'geojson', data: variant.ski_route });

        map!.addLayer(
          {
            id: SKI_CASING_ID,
            type: 'line',
            source: SKI_SOURCE_ID,
            paint: { 'line-color': '#7c2d12', 'line-width': 6, 'line-opacity': 0.35 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          },
          beforeLayer,
        );

        map!.addLayer(
          {
            id: SKI_LINE_ID,
            type: 'line',
            source: SKI_SOURCE_ID,
            paint: { 'line-color': '#F97316', 'line-width': 3 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          },
          beforeLayer,
        );

        // Direction arrows along ski route
        ensureArrowImage(map!);
        map!.addLayer(
          {
            id: SKI_ARROWS_ID,
            type: 'symbol',
            source: SKI_SOURCE_ID,
            layout: {
              'symbol-placement': 'line',
              'symbol-spacing': 80,
              'icon-image': 'route-arrow',
              'icon-size': 0.55,
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
            paint: { 'icon-color': '#F97316', 'icon-opacity': 0.9 },
          },
          beforeLayer,
        );
      }

      // Fit map to combined bounds of all route geometry
      const allCoords: [number, number][] = [
        ...(variant.route.geometry.coordinates as [number, number][]),
        ...((variant.ski_route?.geometry.coordinates ?? []) as [number, number][]),
      ];

      if (allCoords.length >= 2) {
        const bounds = allCoords.reduce(
          (b, c) => b.extend([c[0], c[1]]),
          new mapboxgl.LngLatBounds([allCoords[0][0], allCoords[0][1]], [allCoords[0][0], allCoords[0][1]]),
        );
        const isMobile = window.innerWidth < 768;
        // Include pitch so the single fitBounds animation handles both position
        // and pitch — avoids a competing easeTo from the terrain effect.
        const pitch = useMapStore.getState().show3DTerrain ? 60 : 0;
        map!.fitBounds(bounds, {
          padding: isMobile
            ? { top: 60, bottom: Math.round(window.innerHeight * 0.55), left: 40, right: 40 }
            : 80,
          pitch,
          maxZoom: 14,
          duration: 1200,
          essential: true,
        });
      }
    }

    // Apply immediately if style definition is parsed, otherwise poll.
    // We check getStyle() (style definition ready) instead of isStyleLoaded()
    // (all tiles loaded) because sources/layers can be added as soon as the
    // style is parsed — we don't need to wait for every tile to finish loading.
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function tryApply() {
      if (cancelled) return;
      if (isStyleReady(map!)) {
        apply();
      } else {
        retryTimer = setTimeout(tryApply, 50);
      }
    }

    tryApply();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        removeAll(map);
      } catch {
        // Map may already be removed during page navigation
      }
    };
  }, [map, selectedTourSlug, selectedVariantIndex]);

  // Render a small legend when the selected tour has a ski_route
  const tour = selectedTourSlug ? tours.find((t) => t.slug === selectedTourSlug) : null;
  const variant = tour?.variants[selectedVariantIndex] ?? tour?.variants[0];
  const hasSkiRoute = !!variant?.ski_route;

  if (!hasSkiRoute) return null;

  return (
    <div className="absolute top-3 right-14 z-10 rounded-lg bg-gray-900/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 3" /></svg>
            <span className="text-[10px] text-gray-300">Skin up</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#F97316" strokeWidth="2" /></svg>
            <span className="text-[10px] text-gray-300">Ski down</span>
          </div>
        </div>
      </div>
    </div>
  );
}
