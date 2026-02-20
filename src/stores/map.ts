import { create } from 'zustand';
import { tours } from '@/data/tours';

interface MapState {
  // Viewport
  center: [number, number]; // [lng, lat] - Tahoe default
  zoom: number;
  pitch: number;
  bearing: number;

  // Layer visibility
  showSlopeAngle: boolean;
  showAvyZones: boolean;
  show3DTerrain: boolean;
  showWind: boolean;
  showPrecip: boolean;
  showAspect: boolean;
  showSunExposure: boolean;
  showTreeCover: boolean;
  showHazards: boolean;

  // Selected tour
  selectedTourSlug: string | null;
  selectedVariantIndex: number;

  // Forecast time selection
  selectedForecastHour: number | null; // hourly index into 72-hour forecast, null = "now"

  // Top-ranked tour slugs (set by TourPanel when a forecast hour is selected)
  topTourSlugs: string[]; // ordered best→worst, up to 3

  // Layer loading indicators (keyed by layer name, e.g. 'wind', 'precip', 'routeWeather')
  layerLoading: Record<string, boolean>;

  // Route editing (dev only)
  isEditingRoute: boolean;
  editingCoordinates: [number, number][] | null;
  editingVariantIndex: number;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setPitch: (pitch: number) => void;
  setBearing: (bearing: number) => void;
  toggleSlopeAngle: () => void;
  toggleAvyZones: () => void;
  toggle3DTerrain: () => void;
  toggleWind: () => void;
  togglePrecip: () => void;
  toggleAspect: () => void;
  toggleSunExposure: () => void;
  toggleTreeCover: () => void;
  toggleHazards: () => void;
  setSelectedForecastHour: (hour: number | null) => void;
  setTopTourSlugs: (slugs: string[]) => void;
  selectTour: (slug: string | null) => void;
  setSelectedVariantIndex: (idx: number) => void;
  toggleRouteEditor: () => void;
  setLayerLoading: (layer: string, loading: boolean) => void;
  setEditingCoordinates: (coords: [number, number][] | null) => void;
  setEditingVariantIndex: (idx: number) => void;
}

// Lake Tahoe center coordinates
const TAHOE_CENTER: [number, number] = [-120.0324, 39.0968];
const DEFAULT_ZOOM = 9.5;

export const useMapStore = create<MapState>((set) => ({
  center: TAHOE_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: 0,
  bearing: 0,
  showSlopeAngle: false,
  showAvyZones: false,
  show3DTerrain: false,
  showWind: false,
  showPrecip: false,
  showAspect: false,
  showSunExposure: false,
  showTreeCover: false,
  showHazards: true,
  selectedTourSlug: null,
  selectedVariantIndex: 0,
  selectedForecastHour: null,
  topTourSlugs: [],
  layerLoading: {},
  isEditingRoute: false,
  editingCoordinates: null,
  editingVariantIndex: 0,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setPitch: (pitch) => set({ pitch }),
  setBearing: (bearing) => set({ bearing }),
  toggleSlopeAngle: () => set((state) => ({ showSlopeAngle: !state.showSlopeAngle })),
  toggleAvyZones: () => set((state) => ({ showAvyZones: !state.showAvyZones })),
  toggleWind: () => set((state) => ({ showWind: !state.showWind })),
  togglePrecip: () => set((state) => ({ showPrecip: !state.showPrecip })),
  toggleAspect: () => set((state) => ({ showAspect: !state.showAspect })),
  toggleSunExposure: () => set((state) => ({ showSunExposure: !state.showSunExposure })),
  toggleTreeCover: () => set((state) => ({ showTreeCover: !state.showTreeCover })),
  toggleHazards: () => set((state) => ({ showHazards: !state.showHazards })),
  toggle3DTerrain: () =>
    set((state) => ({
      show3DTerrain: !state.show3DTerrain,
      pitch: !state.show3DTerrain ? 60 : 0,
    })),
  setSelectedForecastHour: (hour) => set({ selectedForecastHour: hour }),
  setTopTourSlugs: (slugs) => set({ topTourSlugs: slugs }),
  selectTour: (slug) =>
    set((state) => slug
      ? { selectedTourSlug: slug, selectedVariantIndex: 0, isEditingRoute: false, editingCoordinates: null }
      : { selectedTourSlug: null, selectedVariantIndex: 0, isEditingRoute: false, editingCoordinates: null, center: TAHOE_CENTER, zoom: DEFAULT_ZOOM, pitch: state.show3DTerrain ? 60 : 0, bearing: 0 },
    ),
  setSelectedVariantIndex: (idx) => set({ selectedVariantIndex: idx }),
  toggleRouteEditor: () =>
    set((state) => {
      if (state.isEditingRoute) {
        return { isEditingRoute: false, editingCoordinates: null };
      }
      const tour = tours.find((t) => t.slug === state.selectedTourSlug);
      const coords = tour?.variants[state.editingVariantIndex]?.route?.geometry?.coordinates;
      return {
        isEditingRoute: true,
        editingCoordinates: coords ? (coords as [number, number][]).map((c) => [...c] as [number, number]) : null,
      };
    }),
  setLayerLoading: (layer, loading) =>
    set((state) => ({
      layerLoading: { ...state.layerLoading, [layer]: loading },
    })),
  setEditingCoordinates: (coords) => set({ editingCoordinates: coords }),
  setEditingVariantIndex: (idx) => set({ editingVariantIndex: idx }),
}));
