'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';

const POINTS_SOURCE = 'route-editor-points';
const POINTS_LAYER = 'route-editor-points-layer';
const LABELS_LAYER = 'route-editor-labels-layer';
const ROUTE_SOURCE = 'selected-tour-route';

function buildPointsFC(coords: [number, number][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: coords.map(([lng, lat], i) => ({
      type: 'Feature' as const,
      properties: { index: i },
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    })),
  };
}

function buildLineFeature(coords: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords },
  };
}

/** Squared distance from point P to segment AB */
function distToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return (px - projX) ** 2 + (py - projY) ** 2;
}

export function RouteEditor({ map }: { map: mapboxgl.Map | null }) {
  const isEditingRoute = useMapStore((s) => s.isEditingRoute);
  const editingCoordinates = useMapStore((s) => s.editingCoordinates);
  const editingVariantIndex = useMapStore((s) => s.editingVariantIndex);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const setEditingCoordinates = useMapStore((s) => s.setEditingCoordinates);
  const setEditingVariantIndex = useMapStore((s) => s.setEditingVariantIndex);
  const toggleRouteEditor = useMapStore((s) => s.toggleRouteEditor);

  // Drag state kept in refs for performance (no React re-renders during drag)
  const isDragging = useRef(false);
  const dragIndex = useRef<number | null>(null);
  const localCoords = useRef<[number, number][]>([]);

  const tour = selectedTourSlug ? tours.find((t) => t.slug === selectedTourSlug) : null;

  // Sync local ref when store coordinates change (not during drag)
  useEffect(() => {
    if (editingCoordinates && !isDragging.current) {
      localCoords.current = editingCoordinates.map((c) => [...c] as [number, number]);
    }
  }, [editingCoordinates]);

  const updateSources = useCallback(() => {
    if (!map) return;
    const pointSrc = map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined;
    const lineSrc = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (pointSrc) pointSrc.setData(buildPointsFC(localCoords.current));
    if (lineSrc) lineSrc.setData(buildLineFeature(localCoords.current));
  }, [map]);

  // Set up layers and event handlers
  useEffect(() => {
    if (!map || !isEditingRoute || !editingCoordinates) return;

    // Add point source + layers
    if (!map.getSource(POINTS_SOURCE)) {
      map.addSource(POINTS_SOURCE, {
        type: 'geojson',
        data: buildPointsFC(editingCoordinates),
      });
    }

    if (!map.getLayer(POINTS_LAYER)) {
      map.addLayer({
        id: POINTS_LAYER,
        type: 'circle',
        source: POINTS_SOURCE,
        paint: {
          'circle-radius': 8,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }

    if (!map.getLayer(LABELS_LAYER)) {
      map.addLayer({
        id: LABELS_LAYER,
        type: 'symbol',
        source: POINTS_SOURCE,
        layout: {
          'text-field': ['to-string', ['get', 'index']],
          'text-size': 10,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });
    }

    // Update line source with editing coordinates
    const lineSrc = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (lineSrc) lineSrc.setData(buildLineFeature(editingCoordinates));

    // --- Event handlers ---

    const onPointMouseDown = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features?.[0]) return;
      const idx = e.features[0].properties?.index;
      if (idx == null) return;

      // Shift+click = delete
      if (e.originalEvent.shiftKey) {
        e.preventDefault();
        const coords = [...localCoords.current];
        if (coords.length <= 2) return; // minimum for LineString
        coords.splice(idx, 1);
        localCoords.current = coords;
        setEditingCoordinates(coords);
        return;
      }

      e.preventDefault();
      isDragging.current = true;
      dragIndex.current = idx;
      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isDragging.current || dragIndex.current == null) return;
      localCoords.current[dragIndex.current] = [e.lngLat.lng, e.lngLat.lat];
      updateSources();
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      dragIndex.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';
      setEditingCoordinates([...localCoords.current]);
    };

    const onLineClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (isDragging.current) return;
      // Check we didn't also hit a point
      const pointHits = map.queryRenderedFeatures(e.point, { layers: [POINTS_LAYER] });
      if (pointHits.length > 0) return;

      const clickLng = e.lngLat.lng;
      const clickLat = e.lngLat.lat;
      const coords = localCoords.current;

      // Find nearest segment
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const d = distToSegmentSq(clickLng, clickLat, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      const newCoords = [...coords];
      newCoords.splice(bestIdx + 1, 0, [clickLng, clickLat]);
      localCoords.current = newCoords;
      setEditingCoordinates(newCoords);
    };

    const onPointEnter = () => {
      if (!isDragging.current) map.getCanvas().style.cursor = 'grab';
    };
    const onPointLeave = () => {
      if (!isDragging.current) map.getCanvas().style.cursor = '';
    };

    map.on('mousedown', POINTS_LAYER, onPointMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', 'selected-tour-route-line', onLineClick);
    map.on('mouseenter', POINTS_LAYER, onPointEnter);
    map.on('mouseleave', POINTS_LAYER, onPointLeave);

    return () => {
      try {
        map.off('mousedown', POINTS_LAYER, onPointMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        map.off('click', 'selected-tour-route-line', onLineClick);
        map.off('mouseenter', POINTS_LAYER, onPointEnter);
        map.off('mouseleave', POINTS_LAYER, onPointLeave);

        if (map.getLayer(LABELS_LAYER)) map.removeLayer(LABELS_LAYER);
        if (map.getLayer(POINTS_LAYER)) map.removeLayer(POINTS_LAYER);
        if (map.getSource(POINTS_SOURCE)) map.removeSource(POINTS_SOURCE);

        map.getCanvas().style.cursor = '';
      } catch {
        // Map may already be removed during page navigation
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isEditingRoute, !!editingCoordinates]);

  // Update point visuals when coordinates change from store (add/delete operations)
  useEffect(() => {
    if (!map || !isEditingRoute || !editingCoordinates) return;
    const pointSrc = map.getSource(POINTS_SOURCE) as GeoJSONSource | undefined;
    if (pointSrc) pointSrc.setData(buildPointsFC(editingCoordinates));
    const lineSrc = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (lineSrc) lineSrc.setData(buildLineFeature(editingCoordinates));
  }, [map, isEditingRoute, editingCoordinates]);

  if (process.env.NODE_ENV !== 'development') return null;
  if (!isEditingRoute || !editingCoordinates || !tour) return null;

  const variantCount = tour.variants.length;

  const handleCopy = () => {
    const formatted = editingCoordinates
      .map(([lng, lat]) => `            [${lng.toFixed(4)}, ${lat.toFixed(4)}],`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
  };

  const handleSave = async () => {
    const res = await fetch('/api/tour-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: selectedTourSlug,
        variantIndex: editingVariantIndex,
        coordinates: editingCoordinates,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Saved to ${data.path}\nTrailhead pin updated to first route point.\nReload the page to see the updated pin.`);
    } else {
      const data = await res.json().catch(() => null);
      alert(`Save failed: ${data?.error ?? res.statusText}`);
    }
  };

  return (
    <div className="absolute bottom-4 left-3 z-20 w-64 rounded-lg bg-white p-3 shadow-lg">
      <div className="mb-2 text-xs font-semibold text-gray-900">
        Editing: {tour.name}
      </div>

      {variantCount > 1 && (
        <div className="mb-2 flex gap-1">
          {tour.variants.map((v, i) => (
            <button
              key={i}
              onClick={() => {
                setEditingVariantIndex(i);
                const coords = tour.variants[i]?.route?.geometry?.coordinates;
                if (coords) {
                  const copied = (coords as [number, number][]).map((c) => [...c] as [number, number]);
                  setEditingCoordinates(copied);
                }
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                i === editingVariantIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-2 text-[11px] text-gray-500">
        {editingCoordinates.length} points · Drag to move · Shift+click to delete · Click line to add
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="rounded bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
        >
          Save to File
        </button>
        <button
          onClick={toggleRouteEditor}
          className="rounded bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}
