import type mapboxgl from 'mapbox-gl';

/**
 * Check whether a Mapbox GL map's style is ready for layer/source manipulation.
 *
 * `map.getStyle()` throws "Style is not done loading" if the style hasn't
 * finished parsing. This wrapper catches that and returns false instead.
 */
export function isStyleReady(map: mapboxgl.Map): boolean {
  try {
    return !!map.getStyle();
  } catch {
    return false;
  }
}
