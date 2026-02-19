/**
 * Approximate boundary of the Sierra Avalanche Center (SAC)
 * Central Sierra Nevada forecast zone covering the Lake Tahoe region.
 *
 * This is a simplified polygon for map display purposes.
 * The actual zone boundary follows terrain features along the Sierra crest.
 */
export const SAC_ZONE_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Central Sierra Nevada',
        center_id: 'SAC',
        url: 'https://www.sierraavalanchecenter.org',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-120.65, 39.55], // NW - north of Donner
            [-120.05, 39.55], // NE - east of Tahoe
            [-119.75, 39.35], // East - Mount Rose area
            [-119.80, 39.10], // East - east shore
            [-119.85, 38.80], // SE - south of Tahoe
            [-120.10, 38.65], // South - Carson Pass
            [-120.45, 38.65], // SW - south end
            [-120.55, 38.85], // West - west of Desolation
            [-120.60, 39.15], // West - west shore
            [-120.65, 39.55], // close polygon
          ],
        ],
      },
    },
  ],
};
