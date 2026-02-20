'use client';

import { useRef, useEffect, useCallback, useState, lazy, Suspense } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/map';
import { tours } from '@/data/tours';
import { TourRoute } from './TourRoute';
import { RouteEditor } from './RouteEditor';
import { PrecipOverlay } from './PrecipOverlay';
import { RouteWeatherDots } from './RouteWeatherDots';
import { HazardOverlay } from './HazardOverlay';
import { SAC_ZONE_GEOJSON } from '@/data/avy-zones';

// Code-split overlays that are off by default — only loaded when toggled on
const SlopeOverlay = lazy(() => import('./SlopeOverlay').then((m) => ({ default: m.SlopeOverlay })));
const AspectOverlay = lazy(() => import('./AspectOverlay').then((m) => ({ default: m.AspectOverlay })));
const SunExposureOverlay = lazy(() => import('./SunExposureOverlay').then((m) => ({ default: m.SunExposureOverlay })));
const TreeCoverOverlay = lazy(() => import('./TreeCoverOverlay').then((m) => ({ default: m.TreeCoverOverlay })));

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#50B848',
  intermediate: '#3B82F6',
  advanced: '#F7941E',
  expert: '#ED1C24',
};

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
 *  `topSlugs` adds a `rank` property (1/2/3) for the top-ranked tours. */
function buildMarkerGeoJSON(topSlugs: string[] = []): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: tours.map((tour) => {
      const firstCoord = tour.variants[0]?.route.geometry.coordinates[0] as
        | [number, number]
        | undefined;
      const geometry = firstCoord
        ? { type: 'Point' as const, coordinates: [firstCoord[0], firstCoord[1]] }
        : tour.trailhead.geometry;

      const rankIdx = topSlugs.indexOf(tour.slug);
      return {
        type: 'Feature' as const,
        geometry,
        properties: {
          slug: tour.slug,
          name: tour.name,
          difficulty: tour.difficulty,
          rank: rankIdx >= 0 ? rankIdx + 1 : 0, // 1, 2, 3, or 0 (unranked)
        },
      };
    }),
  };
}

export function TourMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { center, zoom, pitch, bearing, show3DTerrain, showAvyZones } =
    useMapStore();
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const setPitch = useMapStore((s) => s.setPitch);
  const setBearing = useMapStore((s) => s.setBearing);
  const selectTour = useMapStore((s) => s.selectTour);
  const selectedTourSlug = useMapStore((s) => s.selectedTourSlug);
  const topTourSlugs = useMapStore((s) => s.topTourSlugs);

  const handleMoveEnd = useCallback(() => {
    if (!mapRef.current) return;
    const mapCenter = mapRef.current.getCenter();
    setCenter([mapCenter.lng, mapCenter.lat]);
    setZoom(mapRef.current.getZoom());
    setPitch(mapRef.current.getPitch());
    setBearing(mapRef.current.getBearing());
  }, [setCenter, setZoom, setPitch, setBearing]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom,
      pitch,
      bearing,
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

      newMap.addLayer({
        id: 'tour-markers-layer',
        type: 'circle',
        source: 'tour-markers',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'difficulty'],
            'beginner',
            DIFFICULTY_COLORS.beginner,
            'intermediate',
            DIFFICULTY_COLORS.intermediate,
            'advanced',
            DIFFICULTY_COLORS.advanced,
            'expert',
            DIFFICULTY_COLORS.expert,
            '#3B82F6',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-opacity': 1,
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

      // Rank badge — shows "1", "2", "3" on top-ranked markers
      newMap.addLayer({
        id: 'tour-rank-badges',
        type: 'symbol',
        source: 'tour-markers',
        filter: ['>', ['get', 'rank'], 0],
        layout: {
          'text-field': ['to-string', ['get', 'rank']],
          'text-size': 10,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#ffffff',
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

  // Fit all tour markers in the visible area when no tour is selected.
  // On mobile the bottom sheet covers ~45% of the viewport, so we use heavy
  // bottom padding so markers sit above the drawer.
  const prevSlugRef = useRef<string | null>(null);
  useEffect(() => {
    const wasSelected = prevSlugRef.current;
    prevSlugRef.current = selectedTourSlug;

    if (!selectedTourSlug && mapRef.current) {
      const isMobile = window.innerWidth < 768;
      const animate = !!wasSelected;

      mapRef.current.fitBounds(getTourMarkerBounds(), {
        padding: isMobile
          ? { top: 60, bottom: Math.round(window.innerHeight * 0.48), left: 20, right: 20 }
          : { top: 40, bottom: 40, left: 40, right: 40 },
        pitch: show3DTerrain ? 60 : 0,
        bearing: 0,
        maxZoom: 10,
        duration: animate ? 1000 : 0,
      });
    }
  }, [selectedTourSlug, show3DTerrain, mapReady]);

  // Refs so the styledata handler always reads fresh values (no stale closures)
  const topSlugsRef = useRef<string[]>([]);
  const selectedSlugRef = useRef<string | null>(null);
  useEffect(() => { topSlugsRef.current = topTourSlugs; }, [topTourSlugs]);
  useEffect(() => { selectedSlugRef.current = selectedTourSlug; }, [selectedTourSlug]);

  // Apply marker paint properties + GeoJSON rank data
  const applyMarkerStyles = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('tour-markers-layer')) return;

    const slugs = topSlugsRef.current;
    const selected = selectedSlugRef.current;

    // Update GeoJSON source with current rank data
    const source = map.getSource('tour-markers') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildMarkerGeoJSON(slugs));
    }

    const hasRanking = slugs.length > 0;

    // Circle radius: selected=12, ranked=11, default=8
    map.setPaintProperty('tour-markers-layer', 'circle-radius', [
      'case',
      ['==', ['get', 'slug'], selected ?? ''],
      12,
      ['>', ['get', 'rank'], 0],
      11,
      8,
    ]);

    // Circle color: gold/silver/bronze for ranked, difficulty color otherwise
    if (hasRanking) {
      map.setPaintProperty('tour-markers-layer', 'circle-color', [
        'case',
        ['==', ['get', 'rank'], 1], '#EAB308', // gold
        ['==', ['get', 'rank'], 2], '#9CA3AF', // silver
        ['==', ['get', 'rank'], 3], '#D97706', // bronze
        '#D1D5DB', // unranked dim
      ]);
      map.setPaintProperty('tour-markers-layer', 'circle-opacity', [
        'case',
        ['>', ['get', 'rank'], 0], 1,
        0.5,
      ]);
      map.setPaintProperty('tour-markers-layer', 'circle-stroke-width', [
        'case',
        ['>', ['get', 'rank'], 0], 3,
        2,
      ]);
    } else {
      // Restore default difficulty-based colors
      map.setPaintProperty('tour-markers-layer', 'circle-color', [
        'match',
        ['get', 'difficulty'],
        'beginner', DIFFICULTY_COLORS.beginner,
        'intermediate', DIFFICULTY_COLORS.intermediate,
        'advanced', DIFFICULTY_COLORS.advanced,
        'expert', DIFFICULTY_COLORS.expert,
        '#3B82F6',
      ]);
      map.setPaintProperty('tour-markers-layer', 'circle-opacity', 1);
      map.setPaintProperty('tour-markers-layer', 'circle-stroke-width', 2.5);
    }
  }, []);

  // Register styledata listener once when map is ready — reads from refs so always fresh
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.on('styledata', applyMarkerStyles);
    return () => { map.off('styledata', applyMarkerStyles); };
  }, [mapReady, applyMarkerStyles]);

  // Apply immediately when ranking or selection changes
  useEffect(() => {
    applyMarkerStyles();
  }, [selectedTourSlug, topTourSlugs, applyMarkerStyles]);

  // Toggle 3D terrain
  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) return;
    if (show3DTerrain) {
      mapRef.current.setTerrain({ source: 'mapbox-terrain', exaggeration: 1.2 });
      mapRef.current.easeTo({ pitch: 60, duration: 1000 });
    } else {
      mapRef.current.setTerrain(null);
      mapRef.current.easeTo({ pitch: 0, duration: 1000 });
    }
  }, [show3DTerrain]);

  // Toggle avy zones layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
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
      {/* Right-side legends stacked in a flex column to prevent overlap */}
      <div className="absolute bottom-10 right-3 z-10 flex flex-col items-end gap-2">
        {mapReady && (
          <Suspense fallback={null}>
            <SlopeOverlay map={mapRef.current} />
            <TreeCoverOverlay map={mapRef.current} />
            <SunExposureOverlay map={mapRef.current} />
            <AspectOverlay map={mapRef.current} />
          </Suspense>
        )}
      </div>
      {mapReady && <RouteWeatherDots map={mapRef.current} />}
      {mapReady && <HazardOverlay map={mapRef.current} />}
    </>
  );
}
