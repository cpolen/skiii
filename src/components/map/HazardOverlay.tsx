'use client';

import { useEffect, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DOMPurify from 'dompurify';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import type { TerrainTrap, OverheadHazard } from '@/lib/types/tour';

// ---------------------------------------------------------------------------
// Layer / source IDs
// ---------------------------------------------------------------------------

const ZONES_SOURCE = 'hazard-zones';
const ZONES_LAYER = 'hazard-zones-layer';
const POINTS_SOURCE = 'hazard-points';
const POINTS_LAYER = 'hazard-points-layer';
const LABELS_LAYER = 'hazard-labels-layer';

const ALL_LAYERS = [LABELS_LAYER, POINTS_LAYER, ZONES_LAYER];
const ALL_SOURCES = [POINTS_SOURCE, ZONES_SOURCE];

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const TRAP_COLORS: Record<TerrainTrap['type'], string> = {
  gully: '#F97316',
  cliff: '#EA580C',
  creek: '#0EA5E9',
  dense_trees: '#16A34A',
  lake: '#3B82F6',
  flat: '#A855F7',
};

const HAZARD_COLORS: Record<OverheadHazard['type'], string> = {
  cornice: '#EF4444',
  avalanche_path: '#DC2626',
  serac: '#BE185D',
  rockfall: '#92400E',
};

const LABEL_MAP: Record<string, string> = {
  gully: 'Gully',
  cliff: 'Cliff',
  creek: 'Creek',
  dense_trees: 'Dense Trees',
  lake: 'Lake',
  flat: 'Flat Runout',
  cornice: 'Cornice',
  avalanche_path: 'Avy Path',
  serac: 'Serac',
  rockfall: 'Rockfall',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function removeAll(map: mapboxgl.Map) {
  try {
    for (const id of ALL_LAYERS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of ALL_SOURCES) {
      if (map.getSource(id)) map.removeSource(id);
    }
  } catch {
    // Map may be torn down
  }
}

function buildGeoJSON(
  traps: TerrainTrap[],
  hazards: OverheadHazard[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const t of traps) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: t.location },
      properties: {
        name: LABEL_MAP[t.type] ?? t.type,
        type: t.type,
        category: 'trap',
        color: TRAP_COLORS[t.type] ?? '#F97316',
        description: t.description,
      },
    });
  }

  for (const h of hazards) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: h.location },
      properties: {
        name: LABEL_MAP[h.type] ?? h.type,
        type: h.type,
        category: 'hazard',
        color: HAZARD_COLORS[h.type] ?? '#EF4444',
        description: h.description,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HazardOverlay({ map }: { map: mapboxgl.Map | null }) {
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const showHazards = useMapStore((s) => s.showHazards);

  const tour = useMemo(
    () => (selectedTourSlug ? tours.find((t) => t.slug === selectedTourSlug) : null),
    [selectedTourSlug],
  );

  useEffect(() => {
    if (!map) return;

    // Track event handlers for cleanup
    let clickHandler: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
    let enterHandler: (() => void) | null = null;
    let leaveHandler: (() => void) | null = null;
    let pendingStyleHandler: (() => void) | null = null;

    const apply = () => {
      removeAll(map);

      if (!tour || !showHazards) return;
      if (tour.terrain_traps.length === 0 && tour.overhead_hazards.length === 0) return;

      const geojson = buildGeoJSON(tour.terrain_traps, tour.overhead_hazards);

      // Insert before the route casing layer so route lines draw on top of
      // hazard zones. Fall back to tour-markers-layer → undefined (top of stack).
      const beforeLayer =
        map.getLayer('selected-tour-route-casing') ? 'selected-tour-route-casing' :
        map.getLayer('tour-markers-layer') ? 'tour-markers-layer' :
        undefined;

      // Influence zone circles
      map.addSource(ZONES_SOURCE, { type: 'geojson', data: geojson });
      map.addLayer(
        {
          id: ZONES_LAYER,
          type: 'circle',
          source: ZONES_SOURCE,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.12,
            // ~120m radius, scaled by zoom so it stays geographically consistent
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              10, 5,
              13, 36,
              16, 290,
            ],
          },
        },
        beforeLayer,
      );

      // Point markers
      map.addSource(POINTS_SOURCE, { type: 'geojson', data: geojson });
      map.addLayer(
        {
          id: POINTS_LAYER,
          type: 'circle',
          source: POINTS_SOURCE,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9,
          },
        },
        beforeLayer,
      );

      // Labels
      map.addLayer(
        {
          id: LABELS_LAYER,
          type: 'symbol',
          source: POINTS_SOURCE,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-offset': [0, 1.6],
            'text-anchor': 'top',
            'text-optional': true,
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        },
        beforeLayer,
      );

      // Click → popup
      clickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const props = feature.properties;
        if (!props) return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const category = props.category === 'hazard' ? 'Overhead Hazard' : 'Terrain Trap';

        new mapboxgl.Popup({ offset: 12, maxWidth: '260px' })
          .setLngLat(coords)
          .setHTML(
            DOMPurify.sanitize(
              `<div style="font-family:system-ui,sans-serif">` +
                `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:2px">${category}</div>` +
                `<div style="font-size:13px;font-weight:600;color:${props.color};margin-bottom:4px">${props.name}</div>` +
                `<div style="font-size:12px;color:#374151;line-height:1.4">${props.description}</div>` +
              `</div>`,
            ),
          )
          .addTo(map);
      };
      map.on('click', POINTS_LAYER, clickHandler);

      enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
      leaveHandler = () => { map.getCanvas().style.cursor = ''; };
      map.on('mouseenter', POINTS_LAYER, enterHandler);
      map.on('mouseleave', POINTS_LAYER, leaveHandler);
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      pendingStyleHandler = apply;
      map.once('styledata', pendingStyleHandler);
    }

    return () => {
      // Cancel pending styledata handler if it hasn't fired yet
      if (pendingStyleHandler) {
        map.off('styledata', pendingStyleHandler);
      }
      // Remove event listeners before removing layers
      if (clickHandler) map.off('click', POINTS_LAYER, clickHandler);
      if (enterHandler) map.off('mouseenter', POINTS_LAYER, enterHandler);
      if (leaveHandler) map.off('mouseleave', POINTS_LAYER, leaveHandler);
      removeAll(map);
    };
  }, [map, tour, showHazards]);

  // No DOM legend — the labels on the map are self-explanatory
  return null;
}
