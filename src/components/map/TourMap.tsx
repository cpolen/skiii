'use client';

import { useRef, useEffect, useCallback, useState, lazy, Suspense, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { useShallow } from 'zustand/react/shallow';
import { tours } from '@/data/tours';
import { TourRoute } from './TourRoute';
import { RouteEditor } from './RouteEditor';
import { PrecipOverlay } from './PrecipOverlay';
import { RouteWeatherDots } from './RouteWeatherDots';
import { HazardOverlay } from './HazardOverlay';
import { SAC_ZONE_GEOJSON } from '@/data/avy-zones';
import { isStyleReady } from '@/lib/mapStyle';

import { LegendPanel } from './LegendPanel';

// Code-split overlays that are off by default — only loaded when toggled on
const SlopeOverlay = lazy(() => import('./SlopeOverlay').then((m) => ({ default: m.SlopeOverlay })));
const AspectOverlay = lazy(() => import('./AspectOverlay').then((m) => ({ default: m.AspectOverlay })));
const SunExposureOverlay = lazy(() => import('./SunExposureOverlay').then((m) => ({ default: m.SunExposureOverlay })));
const TreeCoverOverlay = lazy(() => import('./TreeCoverOverlay').then((m) => ({ default: m.TreeCoverOverlay })));

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Conditions score color thresholds (Surfline-inspired traffic light system).
 *  Score -1 means "loading" and renders as neutral gray. */
const SCORE_COLORS = {
  gray: '#9CA3AF',    // < 20 or loading
  red: '#EF4444',     // 20-39
  orange: '#F7941E',  // 40-59
  yellow: '#EAB308',  // 60-79
  green: '#16A34A',   // >= 80
} as const;

/** Bounding box that contains all tour marker positions. */
function getTourMarkerBounds(): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  for (const tour of tours) {
    const firstCoord = tour.variants[0]?.route.geometry.coordinates[0] as
      | [number, number]
      | undefined;
    const [lng, lat] = firstCoord ?? tour.trailhead.geometry.coordinates;
    bounds.extend([lng, lat]);
  }
  return bounds;
}

/** Build a GeoJSON FeatureCollection from tour trailheads.
 *  Uses the first coordinate of the primary route as the marker position
 *  so it always matches the route start, falling back to the trailhead field.
 *  `scores` maps tour slug to composite conditions score (0-100, or -1 for loading). */
function buildMarkerGeoJSON(scores: Record<string, number> = {}): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: tours.map((tour) => {
      const firstCoord = tour.variants[0]?.route.geometry.coordinates[0] as
        | [number, number]
        | undefined;
      const geometry = firstCoord
        ? { type: 'Point' as const, coordinates: [firstCoord[0], firstCoord[1]] }
        : tour.trailhead.geometry;

      return {
        type: 'Feature' as const,
        geometry,
        properties: {
          slug: tour.slug,
          name: tour.name,
          difficulty: tour.difficulty,
          score: scores[tour.slug] ?? -1, // -1 = loading/unknown
        },
      };
    }),
  };
}

export const TourMap = memo(function TourMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Only subscribe to the values TourMap actually reacts to.
  // Previously this used useMapStore() (no selector), which re-rendered TourMap
  // on EVERY store change (layerLoading, selectedForecastHour, etc.) —
  // cascading through every child map component on unrelated state changes.
  const { show3DTerrain, showAvyZones } = useMapStore(
    useShallow((s) => ({ show3DTerrain: s.show3DTerrain, showAvyZones: s.showAvyZones })),
  );
  const selectTour = useMapStore((s) => s.selectTour);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const tourScores = useMapStore((s) => s.tourScores);
  const filteredTourSlugs = useMapStore((s) => s.filteredTourSlugs);

  // Get the geographic coordinate at the blue "location" dot's pixel position.
  // The dot is centered in the visible map area (above the bottom overlay),
  // not at the true viewport center. We use map.unproject() to find the
  // geographic point at that pixel so the carousel sort matches the dot.
  const getLocationCenter = useCallback((): [number, number] => {
    const map = mapRef.current!;
    const h = map.getContainer().clientHeight;
    const w = map.getContainer().clientWidth;
    // The dot is centered with pb-[220px], so its y = (h - 220) / 2
    const dotY = (h - 220) / 2;
    const geo = map.unproject([w / 2, dotY]);
    return [geo.lng, geo.lat];
  }, []);

  // Sync center on every move (throttled) so the carousel stays sorted
  // during inertial panning, not just after moveend fires.
  // Throttled at 400ms to balance carousel responsiveness vs render pressure
  // (150ms was ~7 renders/sec, causing instability during sustained panning).
  const moveCenterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMove = useCallback(() => {
    if (moveCenterTimer.current) return; // throttle: max once per 400ms
    moveCenterTimer.current = setTimeout(() => {
      moveCenterTimer.current = null;
      if (!mapRef.current) return;
      try {
        useMapStore.setState({ center: getLocationCenter() });
      } catch {
        // map.unproject can fail if the container is in an unusual state
        // during rapid panning — silently skip; next tick retries
      }
    }, 400);
  }, [getLocationCenter]);

  const handleMoveEnd = useCallback(() => {
    if (!mapRef.current) return;
    // Clear any pending throttle so we commit the final position immediately
    if (moveCenterTimer.current) {
      clearTimeout(moveCenterTimer.current);
      moveCenterTimer.current = null;
    }
    // Batch into a single store update instead of 4 separate set() calls
    useMapStore.setState({
      center: getLocationCenter(),
      zoom: mapRef.current.getZoom(),
      pitch: mapRef.current.getPitch(),
      bearing: mapRef.current.getBearing(),
    });
  }, [getLocationCenter]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Read viewport once at init — no need to subscribe to these values
    const initState = useMapStore.getState();

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: initState.center,
      zoom: initState.zoom,
      pitch: initState.pitch,
      bearing: initState.bearing,
      maxBounds: [
        [-121.5, 38.0],
        [-119.0, 40.0],
      ],
    });

    newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
    newMap.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 200, unit: 'imperial' }),
      'bottom-left',
    );

    newMap.on('move', handleMove);
    newMap.on('moveend', handleMoveEnd);

    newMap.on('load', () => {
      // Terrain DEM source for 3D terrain + aspect overlay
      newMap.addSource('mapbox-terrain', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });

      // Tour markers as GeoJSON (renders on WebGL canvas — moves fluidly)
      newMap.addSource('tour-markers', {
        type: 'geojson',
        data: buildMarkerGeoJSON(),
      });

      // Tour markers — colored by conditions score (Surfline traffic-light pattern)
      newMap.addLayer({
        id: 'tour-markers-layer',
        type: 'circle',
        source: 'tour-markers',
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'step',
            ['get', 'score'],
            SCORE_COLORS.gray,   // score < 0 (loading) → gray
            0, SCORE_COLORS.gray,  // 0-19 → gray
            20, SCORE_COLORS.red,  // 20-39 → red
            40, SCORE_COLORS.orange, // 40-59 → orange
            60, SCORE_COLORS.yellow, // 60-79 → yellow
            80, SCORE_COLORS.green,  // 80+ → green
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-opacity': 1,
        },
      });

      // Score badge — shows the composite score number inside each marker
      newMap.addLayer({
        id: 'tour-score-badges',
        type: 'symbol',
        source: 'tour-markers',
        filter: ['>=', ['get', 'score'], 0],
        layout: {
          'text-field': ['to-string', ['get', 'score']],
          'text-size': 9,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Label layer for tour names
      newMap.addLayer({
        id: 'tour-markers-labels',
        type: 'symbol',
        source: 'tour-markers',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      // Click on marker to select tour
      newMap.on('click', 'tour-markers-layer', (e) => {
        const slug = e.features?.[0]?.properties?.slug;
        if (slug) selectTour(slug);
      });
      newMap.on('mouseenter', 'tour-markers-layer', () => {
        newMap.getCanvas().style.cursor = 'pointer';
      });
      newMap.on('mouseleave', 'tour-markers-layer', () => {
        newMap.getCanvas().style.cursor = '';
      });

      setMapReady(true);
    });

    mapRef.current = newMap;

    return () => {
      newMap.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit all tour markers on initial load only (not when returning from detail view).
  const prevSlugRef = useRef<string | null>(null);
  useEffect(() => {
    const wasSelected = prevSlugRef.current;
    prevSlugRef.current = selectedTourSlug;

    // Fit all markers when no tour is selected:
    // - On initial load (wasSelected=false): instant (duration 0)
    // - When deselecting (wasSelected=true): animated fly-out
    if (!selectedTourSlug && mapRef.current) {
      const isMobile = window.innerWidth < 768;
      mapRef.current.fitBounds(getTourMarkerBounds(), {
        padding: isMobile
          ? { top: 60, bottom: 260, left: 30, right: 30 }
          : { top: 60, bottom: 200, left: 60, right: 60 },
        pitch: show3DTerrain ? 60 : 0,
        bearing: 0,
        maxZoom: 9.5,
        duration: wasSelected ? 1200 : 0,
        essential: true,
      });
    }
  }, [selectedTourSlug, show3DTerrain, mapReady]);

  // Refs for styledata handler (avoids stale closures)
  const tourScoresRef = useRef<Record<string, number>>({});
  const selectedSlugRef = useRef<string | null>(null);
  const filteredSlugsRef = useRef<string[] | null>(null);
  useEffect(() => { tourScoresRef.current = tourScores; }, [tourScores]);
  useEffect(() => { selectedSlugRef.current = selectedTourSlug; }, [selectedTourSlug]);
  useEffect(() => { filteredSlugsRef.current = filteredTourSlugs; }, [filteredTourSlugs]);

  // Update marker GeoJSON data and paint when scores or selection change
  const applyMarkerStyles = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('tour-markers-layer')) return;

    const scores = tourScoresRef.current;
    const selected = selectedSlugRef.current;

    // Update GeoJSON source with current score data
    const source = map.getSource('tour-markers') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildMarkerGeoJSON(scores));
    }

    // Enlarge selected marker
    map.setPaintProperty('tour-markers-layer', 'circle-radius', [
      'case',
      ['==', ['get', 'slug'], selected ?? ''],
      12,
      9,
    ]);

    map.setPaintProperty('tour-markers-layer', 'circle-stroke-width', [
      'case',
      ['==', ['get', 'slug'], selected ?? ''],
      3.5,
      2.5,
    ]);

    // Filter markers when a condition filter is active
    const slugs = filteredSlugsRef.current;
    const filter = slugs ? ['in', ['get', 'slug'], ['literal', slugs]] : null;
    map.setFilter('tour-markers-layer', filter);
    map.setFilter('tour-score-badges', slugs
      ? ['all', ['>=', ['get', 'score'], 0], ['in', ['get', 'slug'], ['literal', slugs]]]
      : ['>=', ['get', 'score'], 0]);
    map.setFilter('tour-markers-labels', filter);
  }, []);

  // Register styledata listener once when map is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.on('styledata', applyMarkerStyles);
    return () => { map.off('styledata', applyMarkerStyles); };
  }, [mapReady, applyMarkerStyles]);

  // Apply immediately when scores, selection, or filter change
  useEffect(() => {
    applyMarkerStyles();
  }, [selectedTourSlug, tourScores, filteredTourSlugs, applyMarkerStyles]);

  // Toggle 3D terrain.
  // On mount, only configure the terrain source — skip the easeTo animation
  // so it doesn't cancel TourRoute's fitBounds (which runs first as a child effect).
  // Subsequent user-initiated toggles animate normally.
  const terrainMountRef = useRef(true);
  useEffect(() => {
    if (!mapRef.current || !isStyleReady(mapRef.current)) return;
    const isMount = terrainMountRef.current;
    terrainMountRef.current = false;

    if (show3DTerrain) {
      mapRef.current.setTerrain({ source: 'mapbox-terrain', exaggeration: 1.2 });
      if (!isMount) mapRef.current.easeTo({ pitch: 60, duration: 1000 });
    } else {
      mapRef.current.setTerrain(null);
      if (!isMount) mapRef.current.easeTo({ pitch: 0, duration: 1000 });
    }
  }, [show3DTerrain]);

  // Toggle avy zones layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady(map)) return;
    const sourceId = 'avy-zones';
    const fillId = 'avy-zones-fill';
    const outlineId = 'avy-zones-outline';

    if (showAvyZones) {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: SAC_ZONE_GEOJSON });
      }
      const beforeLayer = map.getLayer('tour-markers-layer') ? 'tour-markers-layer' : undefined;
      if (!map.getLayer(fillId)) {
        map.addLayer(
          {
            id: fillId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': '#F7941E', 'fill-opacity': 0.1 },
          },
          beforeLayer,
        );
      }
      if (!map.getLayer(outlineId)) {
        map.addLayer(
          {
            id: outlineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#F7941E',
              'line-width': 2,
              'line-dasharray': [3, 2],
            },
          },
          beforeLayer,
        );
      }
    } else {
      if (map.getLayer(outlineId)) map.removeLayer(outlineId);
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [showAvyZones, mapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Map Token Required</h2>
          <p className="text-sm text-gray-600">
            Set{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{' '}
            in your <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env.local</code>{' '}
            file to enable the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mapContainer} className="h-full w-full" />
      {mapReady && <TourRoute map={mapRef.current} />}
      {mapReady && <RouteEditor map={mapRef.current} />}
      {mapReady && <PrecipOverlay map={mapRef.current} />}
      {/* Overlay map-layer managers (no DOM output — they return null) */}
      {mapReady && (
        <Suspense fallback={null}>
          <SlopeOverlay map={mapRef.current} />
          <TreeCoverOverlay map={mapRef.current} />
          <SunExposureOverlay map={mapRef.current} />
          <AspectOverlay map={mapRef.current} />
        </Suspense>
      )}
      {/* Legend button + panel — shows legends for all active overlays */}
      <LegendPanel />
      {mapReady && <RouteWeatherDots map={mapRef.current} />}
      {mapReady && <HazardOverlay map={mapRef.current} />}
    </>
  );
});
