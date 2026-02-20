'use client';

import { useMapStore } from '@/stores/map';
import { useShallow } from 'zustand/react/shallow';

export function MapControls() {
  const {
    show3DTerrain, showSlopeAngle, showAvyZones, showWind, showPrecip,
    showAspect, showSunExposure, showTreeCover, showHazards,
    toggle3DTerrain, toggleSlopeAngle, toggleAvyZones, toggleWind, togglePrecip,
    toggleAspect, toggleSunExposure, toggleTreeCover, toggleHazards,
    selectedTourSlug, isEditingRoute, toggleRouteEditor, layerLoading,
  } = useMapStore(useShallow((s) => ({
    show3DTerrain: s.show3DTerrain,
    showSlopeAngle: s.showSlopeAngle,
    showAvyZones: s.showAvyZones,
    showWind: s.showWind,
    showPrecip: s.showPrecip,
    showAspect: s.showAspect,
    showSunExposure: s.showSunExposure,
    showTreeCover: s.showTreeCover,
    showHazards: s.showHazards,
    toggle3DTerrain: s.toggle3DTerrain,
    toggleSlopeAngle: s.toggleSlopeAngle,
    toggleAvyZones: s.toggleAvyZones,
    toggleWind: s.toggleWind,
    togglePrecip: s.togglePrecip,
    toggleAspect: s.toggleAspect,
    toggleSunExposure: s.toggleSunExposure,
    toggleTreeCover: s.toggleTreeCover,
    toggleHazards: s.toggleHazards,
    selectedTourSlug: s.selectedTourSlug,
    isEditingRoute: s.isEditingRoute,
    toggleRouteEditor: s.toggleRouteEditor,
    layerLoading: s.layerLoading,
  })));

  return (
    <div className="absolute left-3 top-3 z-10 hidden md:flex flex-col gap-1.5">
      <LayerButton
        label="3D Terrain"
        active={show3DTerrain}
        onClick={toggle3DTerrain}
        icon="mountain"
      />
      <LayerButton
        label="Slope Angle"
        active={showSlopeAngle}
        onClick={toggleSlopeAngle}
        icon="slope"
      />
      <LayerButton
        label="Avy Zones"
        active={showAvyZones}
        onClick={toggleAvyZones}
        icon="zone"
      />
      <LayerButton label="Aspect" active={showAspect} onClick={toggleAspect} icon="aspect" />
      <LayerButton label="Sun" active={showSunExposure} onClick={toggleSunExposure} icon="sun" />
      <LayerButton label="Trees" active={showTreeCover} onClick={toggleTreeCover} icon="tree" />
      <LayerButton label="Wind" active={showWind} onClick={toggleWind} icon="wind" loading={layerLoading['wind']} />
      <LayerButton label="Precip" active={showPrecip} onClick={togglePrecip} icon="precip" loading={layerLoading['precip']} />
      {selectedTourSlug && (
        <LayerButton label="Hazards" active={showHazards} onClick={toggleHazards} icon="hazard" />
      )}
      {process.env.NODE_ENV === 'development' && selectedTourSlug && (
        <LayerButton
          label="Edit Route"
          active={isEditingRoute}
          onClick={toggleRouteEditor}
          icon="edit"
        />
      )}
    </div>
  );
}

function LayerButton({
  label,
  active,
  onClick,
  icon,
  loading,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
  loading?: boolean;
}) {
  const icons: Record<string, string> = {
    mountain: '\u26F0',
    slope: '\u2220',
    zone: '\u26A0',
    aspect: '\uD83E\uDDED',
    sun: '\u2600',
    tree: '\uD83C\uDF32',
    wind: '\uD83C\uDF2C',
    precip: '\u2744',
    hazard: '\u26A0',
    edit: '\u270E',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium shadow-md transition-colors min-h-[44px] ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50'
      }`}
      aria-label={`Toggle ${label}`}
      aria-pressed={active}
      title={`Toggle ${label}`}
    >
      {active && loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <span>{icons[icon] ?? ''}</span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
