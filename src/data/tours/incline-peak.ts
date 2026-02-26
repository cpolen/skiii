import type { Tour } from '@/lib/types/tour';

export const inclinePeak: Tour = {
  slug: 'incline-peak',
  name: 'Incline Peak',
  description:
    'Incline Peak (9,549ft) rises from the Carson Range above Incline Village, accessed via ' +
    'Incline Lake Road off Mt Rose Highway (SR 431). The tour starts with a descent along ' +
    'Incline Lake Road to Incline Lake before skinning northwest up the drainage and west along ' +
    'the upper ridge to the summit. The east-facing bowl visible from the highway is the prize ' +
    'descent on low avalanche danger days. Multiple descent options from mellow glades to steep ' +
    'chutes make this a versatile objective in the Mt Rose Wilderness.',
  difficulty: 'intermediate',
  ates_rating: 'challenging',
  distance_km: 5.4,
  elevation_gain_m: 460,
  elevation_loss_m: 460,
  max_elevation_m: 2911,
  min_elevation_m: 2500,
  estimated_hours_range: [2.5, 4.5],
  transition_count: 1,
  variants: [
    {
      name: 'East Bowl (via Third Creek)',
      slope_angle_max: 35,
      slope_angle_avg: 18,
      primary_aspects: ['E', 'SE'],
      route: {
        type: 'Feature',
        properties: { name: 'East Bowl (via Third Creek)', difficulty: 'intermediate' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-119.9252, 39.2924],
            [-119.9253, 39.2928],
            [-119.9266, 39.2934],
            [-119.9274, 39.2938],
            [-119.9284, 39.2943],
            [-119.9291, 39.2950],
            [-119.9296, 39.2956],
            [-119.9305, 39.2963],
            [-119.9314, 39.2966],
            [-119.9319, 39.2973],
            [-119.9325, 39.2974],
            [-119.9335, 39.2976],
            [-119.9342, 39.2982],
            [-119.9351, 39.2985],
            [-119.9362, 39.2987],
            [-119.9367, 39.2986],
            [-119.9371, 39.2981],
            [-119.9377, 39.2973],
            [-119.9382, 39.2965],
            [-119.9380, 39.2959],
            [-119.9387, 39.2954],
            [-119.9393, 39.2949],
            [-119.9393, 39.2943],
            [-119.9403, 39.2942],
          ],
        },
      },
    },
  ],
  terrain_traps: [
    { type: 'gully', location: [-119.9305, 39.2963], description: 'The drainage northwest of Incline Lake funnels debris from slopes above — significant terrain trap on the skin track.' },
    { type: 'dense_trees', location: [-119.9266, 39.2934], description: 'Dense tree band above the lake creates tree well hazards, especially during and after heavy snowfall.' },
  ],
  overhead_hazards: [
    { type: 'cornice', location: [-119.9403, 39.2942], description: 'Cornices develop along the summit ridge on east and northeast sides, threatening the East Bowl descent.' },
    { type: 'avalanche_path', location: [-119.9387, 39.2954], description: 'East Bowl is prone to wind slab and storm slab avalanches. Multiple paths converge below the summit.' },
  ],
  escape_routes: [
    'Retrace the skin track: descend southeast through the drainage back to Incline Lake and hike out Incline Lake Road to Hwy 431.',
    'From the upper ridge, traverse south toward the Tahoe Rim Trail and descend east to Tahoe Meadows.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Incline Lake Road Gate (Mt Rose Hwy)', elevation_m: 2500 },
    geometry: { type: 'Point', coordinates: [-119.9252, 39.2924] },
  },
  nearest_snotel: [{ id: '652:NV:SNTL', name: 'Mt Rose Ski Area', elevation_m: 2683 }],
  parking: {
    capacity: '~15 cars across two pullouts',
    fills_by: '9am on weekends',
    permit: 'None required',
    notes:
      'Small pullouts on the west side of Mt Rose Highway (SR 431) at the Incline Lake Road gate, ' +
      'about 1.5 miles past the Mt Rose Summit heading toward Incline Village. ' +
      'The gate blocks vehicle access to Incline Lake Road year-round. Limited plowing.',
  },
  seasonal_notes:
    'Best December through April. East-facing slopes hold wind-loaded powder well after ' +
    'westerly storms. Spring corn cycles excellent on the East Bowl March-April mornings. ' +
    'Popular early season due to high starting elevation (~8,200ft). Ski crampons often ' +
    'needed for the wind-scoured upper ridge near the summit.',
  cell_coverage: 'Good cell coverage at the trailhead on Mt Rose Highway. Spotty once below Incline Lake.',
  sar_jurisdiction: 'Washoe County SAR',
};
