import type { Tour } from '@/lib/types/tour';

export const tamarackPeak: Tour = {
  slug: 'tamarack-peak',
  name: 'Tamarack Peak',
  description:
    'Tamarack Peak (9,872ft) is one of the most accessible backcountry ski destinations in the ' +
    'Mt Rose area, with the trailhead starting at 8,900ft on Mt Rose Highway (SR 431). The ' +
    'standard route descends briefly to Tamarack Lake before climbing to the summit via the ' +
    'east face. Three main descents — Hourglass Bowl, Broken Glass, and the east face — offer ' +
    'varied terrain from intermediate to advanced. The high starting elevation and short approach ' +
    'make multiple laps possible. Hourglass Bowl is considered some of the best snow in Tahoe.',
  difficulty: 'intermediate',
  ates_rating: 'challenging',
  distance_km: 6,
  elevation_gain_m: 400,
  elevation_loss_m: 400,
  max_elevation_m: 3009,
  min_elevation_m: 2716,
  estimated_hours_range: [2.5, 4],
  transition_count: 1,
  variants: [
    {
      name: 'Via Tamarack Lake (Standard)',
      slope_angle_max: 35,
      slope_angle_avg: 22,
      primary_aspects: ['E', 'SE'],
      route: {
        type: 'Feature',
        properties: { name: 'Via Tamarack Lake (Standard)', difficulty: 'intermediate' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-119.8980, 39.3140],
            [-119.8985, 39.3136],
            [-119.8992, 39.3132],
            [-119.8998, 39.3128],
            [-119.9005, 39.3125],
            [-119.9012, 39.3122],
            [-119.9020, 39.3119],
            [-119.9028, 39.3116],
            [-119.9035, 39.3114],
            [-119.9042, 39.3112],
            [-119.9050, 39.3110],
            [-119.9058, 39.3112],
            [-119.9065, 39.3115],
            [-119.9072, 39.3118],
            [-119.9080, 39.3122],
            [-119.9088, 39.3126],
            [-119.9095, 39.3130],
            [-119.9102, 39.3135],
            [-119.9108, 39.3140],
            [-119.9114, 39.3146],
            [-119.9120, 39.3152],
            [-119.9126, 39.3158],
            [-119.9132, 39.3164],
            [-119.9138, 39.3170],
            [-119.9144, 39.3175],
            [-119.9150, 39.3180],
            [-119.9158, 39.3184],
            [-119.9166, 39.3186],
            [-119.9175, 39.3188],
            [-119.9185, 39.3188],
            [-119.9195, 39.3186],
            [-119.9205, 39.3184],
            [-119.9215, 39.3182],
            [-119.9219, 39.3182],
          ],
        },
      },
    },
    {
      name: 'Hourglass Bowl',
      slope_angle_max: 38,
      slope_angle_avg: 28,
      primary_aspects: ['NE', 'E'],
      route: {
        type: 'Feature',
        properties: { name: 'Hourglass Bowl', difficulty: 'advanced' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-119.8980, 39.3140],
            [-119.8985, 39.3136],
            [-119.8992, 39.3132],
            [-119.8998, 39.3128],
            [-119.9005, 39.3125],
            [-119.9012, 39.3122],
            [-119.9020, 39.3119],
            [-119.9028, 39.3116],
            [-119.9035, 39.3114],
            [-119.9042, 39.3112],
            [-119.9050, 39.3110],
            [-119.9058, 39.3112],
            [-119.9065, 39.3118],
            [-119.9072, 39.3125],
            [-119.9080, 39.3132],
            [-119.9088, 39.3140],
            [-119.9095, 39.3148],
            [-119.9102, 39.3156],
            [-119.9110, 39.3164],
            [-119.9118, 39.3170],
            [-119.9128, 39.3176],
            [-119.9140, 39.3180],
            [-119.9155, 39.3184],
            [-119.9170, 39.3186],
            [-119.9185, 39.3186],
            [-119.9200, 39.3184],
            [-119.9215, 39.3182],
            [-119.9219, 39.3182],
          ],
        },
      },
    },
  ],
  terrain_traps: [
    { type: 'lake', location: [-119.9050, 39.3110], description: 'Tamarack Lake basin sits below the E face and could trap avalanche debris.' },
    { type: 'dense_trees', location: [-119.9072, 39.3118], description: 'Trees below the open slopes create pockets that can trap debris and complicate rescue.' },
  ],
  overhead_hazards: [
    { type: 'avalanche_path', location: [-119.9144, 39.3175], description: 'Wind-loaded pockets near the summit ridge can release slabs onto the upper route.' },
    { type: 'cornice', location: [-119.9219, 39.3182], description: 'Small cornices form along the NW ridge of the summit.' },
  ],
  escape_routes: ['Descend E back to Tamarack Lake and skin out to the highway. Short tour makes bailout straightforward.'],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Mt Rose Highway Pullout (SR 431)', elevation_m: 2716 },
    geometry: { type: 'Point', coordinates: [-119.8980, 39.3140] },
  },
  nearest_snotel: [{ id: '652:NV:SNTL', name: 'Mount Rose Ski Area', elevation_m: 2683 }],
  parking: {
    capacity: '~20 cars',
    fills_by: '9am on weekends',
    permit: 'No Sno-Park pass required (NDOT plowed lot)',
    notes:
      'Large pullout on the south side of Mt Rose Highway (SR 431), approximately 0.5 miles ' +
      'east of the highway summit. Be careful crossing — snow walls can be over 8ft tall. ' +
      'The skin track passes through known avalanche zones — make sure your beacon is on.',
  },
  seasonal_notes:
    'Best December through April. Hourglass Bowl holds some of the best snow in Tahoe. ' +
    'E/SE aspects receive early morning sun for spring corn. Summit is frequently wind-affected. ' +
    'High starting elevation (8,900ft) means reliable snow early and late season.',
  cell_coverage: 'Good at trailhead and most of route due to proximity to Mount Rose Highway.',
  sar_jurisdiction: 'Washoe County SAR',
};
