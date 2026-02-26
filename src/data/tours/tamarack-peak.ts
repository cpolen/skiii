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
            [-119.9024, 39.3204],  // SR 431 pullout, south side of Mt Rose Hwy
            [-119.9028, 39.3199],
            [-119.9032, 39.3194],
            [-119.9035, 39.3188],
            [-119.9037, 39.3182],
            [-119.9038, 39.3175],
            [-119.9040, 39.3168],
            [-119.9042, 39.3160],
            [-119.9044, 39.3152],
            [-119.9046, 39.3144],
            [-119.9048, 39.3136],
            [-119.9050, 39.3128],
            [-119.9054, 39.3120],  // Descending toward Tamarack Lake
            [-119.9058, 39.3115],
            [-119.9062, 39.3112],  // Tamarack Lake basin
            [-119.9070, 39.3113],
            [-119.9078, 39.3115],
            [-119.9085, 39.3118],
            [-119.9092, 39.3122],
            [-119.9098, 39.3126],
            [-119.9104, 39.3130],
            [-119.9110, 39.3135],
            [-119.9116, 39.3140],
            [-119.9122, 39.3145],
            [-119.9128, 39.3150],
            [-119.9134, 39.3155],
            [-119.9140, 39.3158],
            [-119.9148, 39.3162],
            [-119.9155, 39.3166],
            [-119.9162, 39.3170],
            [-119.9170, 39.3174],
            [-119.9178, 39.3178],
            [-119.9186, 39.3182],
            [-119.9194, 39.3186],
            [-119.9202, 39.3188],
            [-119.9210, 39.3190],
            [-119.9219, 39.3182],  // Tamarack Peak summit 9,872 ft
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
            [-119.9024, 39.3204],  // SR 431 pullout, south side of Mt Rose Hwy
            [-119.9028, 39.3199],
            [-119.9032, 39.3194],
            [-119.9035, 39.3188],
            [-119.9037, 39.3182],
            [-119.9038, 39.3175],
            [-119.9040, 39.3168],
            [-119.9042, 39.3160],
            [-119.9044, 39.3152],
            [-119.9046, 39.3144],
            [-119.9048, 39.3136],
            [-119.9050, 39.3128],
            [-119.9054, 39.3120],  // Descending toward Tamarack Lake
            [-119.9058, 39.3115],
            [-119.9062, 39.3112],  // Tamarack Lake basin
            [-119.9070, 39.3113],
            [-119.9078, 39.3115],
            [-119.9086, 39.3120],
            [-119.9094, 39.3126],
            [-119.9102, 39.3132],
            [-119.9110, 39.3140],
            [-119.9118, 39.3148],
            [-119.9126, 39.3155],
            [-119.9134, 39.3160],
            [-119.9142, 39.3165],
            [-119.9150, 39.3170],
            [-119.9158, 39.3174],
            [-119.9166, 39.3178],
            [-119.9174, 39.3182],
            [-119.9182, 39.3186],
            [-119.9190, 39.3188],
            [-119.9200, 39.3190],
            [-119.9210, 39.3190],
            [-119.9219, 39.3182],  // Tamarack Peak summit 9,872 ft
          ],
        },
      },
    },
  ],
  terrain_traps: [
    { type: 'lake', location: [-119.9054, 39.3113], description: 'Tamarack Lake basin sits below the E face and could trap avalanche debris.' },
    { type: 'dense_trees', location: [-119.9078, 39.3115], description: 'Trees below the open slopes create pockets that can trap debris and complicate rescue.' },
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
    geometry: { type: 'Point', coordinates: [-119.9024, 39.3204] },
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
