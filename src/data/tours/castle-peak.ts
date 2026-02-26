import type { Tour } from '@/lib/types/tour';

export const castlePeak: Tour = {
  slug: 'castle-peak',
  name: 'Castle Peak',
  description:
    'Castle Peak is the highest point in the Donner Summit area and one of the most popular ' +
    'backcountry ski tours off I-80. The standard NE ridge route follows the PCT approach ' +
    'through gentle terrain before ascending the ridge to the 9,103ft summit. A steeper ' +
    'south couloir variant offers expert-level skiing best suited for spring consolidation. ' +
    'The summit provides panoramic views of Lake Tahoe, Donner Lake, and the Sierra Crest.',
  difficulty: 'intermediate',
  ates_rating: 'challenging',
  distance_km: 8.5,
  elevation_gain_m: 670,
  elevation_loss_m: 670,
  max_elevation_m: 2775,
  min_elevation_m: 2134,
  estimated_hours_range: [3.5, 5.5],
  transition_count: 1,
  variants: [
    {
      name: 'Standard Route (NE Ridge)',
      slope_angle_max: 32,
      slope_angle_avg: 22,
      primary_aspects: ['N', 'NE'],
      route: {
        type: 'Feature',
        properties: { name: 'Standard Route (NE Ridge)', difficulty: 'intermediate' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.3440, 39.3399],  // Donner Summit Sno-Park (USFS: 39.33988, -120.34394)
            [-120.3445, 39.3402],  // Walk W toward I-80 underpass
            [-120.3450, 39.3406],
            [-120.3452, 39.3412],  // Cross under I-80, head N on Castle Peak road
            [-120.3450, 39.3420],
            [-120.3448, 39.3428],
            [-120.3445, 39.3435],
            [-120.3440, 39.3440],
            [-120.3430, 39.3445],
            [-120.3420, 39.3450],
            [-120.3430, 39.3455],
            [-120.3440, 39.3460],
            [-120.3448, 39.3466],
            [-120.3455, 39.3472],
            [-120.3460, 39.3478],
            [-120.3465, 39.3485],
            [-120.3468, 39.3492],
            [-120.3470, 39.3500],
            [-120.3472, 39.3508],
            [-120.3474, 39.3515],
            [-120.3476, 39.3522],
            [-120.3478, 39.3529],
            [-120.3479, 39.3536],
            [-120.3480, 39.3543],
            [-120.3480, 39.3550],
            [-120.3481, 39.3557],
            [-120.3482, 39.3564],
            [-120.3482, 39.3571],
            [-120.3482, 39.3578],
            [-120.3482, 39.3585],
            [-120.3482, 39.3592],
            [-120.3481, 39.3599],
            [-120.3481, 39.3606],
            [-120.3481, 39.3613],
            [-120.3481, 39.3620],
            [-120.3480, 39.3627],
            [-120.3480, 39.3634],
            [-120.3482, 39.3640],
            [-120.3485, 39.3646],
            [-120.3488, 39.3651],
            [-120.3491, 39.3655],  // Castle Peak summit 9,103 ft (PeakBagger)
          ],
        },
      },
    },
    {
      name: 'South Couloir',
      slope_angle_max: 45,
      slope_angle_avg: 35,
      primary_aspects: ['S', 'SE'],
      route: {
        type: 'Feature',
        properties: { name: 'South Couloir', difficulty: 'expert' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.3440, 39.3399],  // Donner Summit Sno-Park (USFS)
            [-120.3445, 39.3402],
            [-120.3450, 39.3406],
            [-120.3452, 39.3412],
            [-120.3450, 39.3420],
            [-120.3448, 39.3428],
            [-120.3445, 39.3435],
            [-120.3440, 39.3440],
            [-120.3430, 39.3445],
            [-120.3420, 39.3450],
            [-120.3430, 39.3455],
            [-120.3440, 39.3460],
            [-120.3448, 39.3466],
            [-120.3455, 39.3472],
            [-120.3460, 39.3478],
            [-120.3465, 39.3485],
            [-120.3468, 39.3492],
            [-120.3470, 39.3500],
            [-120.3472, 39.3508],
            [-120.3474, 39.3515],
            [-120.3476, 39.3522],
            [-120.3478, 39.3529],
            [-120.3479, 39.3536],
            [-120.3480, 39.3543],
            [-120.3485, 39.3550],  // South couloir diverges: trend more W
            [-120.3492, 39.3555],
            [-120.3500, 39.3560],
            [-120.3508, 39.3567],
            [-120.3512, 39.3575],
            [-120.3510, 39.3583],
            [-120.3505, 39.3590],
            [-120.3502, 39.3597],
            [-120.3498, 39.3604],
            [-120.3495, 39.3611],
            [-120.3492, 39.3618],
            [-120.3490, 39.3625],
            [-120.3487, 39.3632],
            [-120.3484, 39.3639],
            [-120.3486, 39.3645],
            [-120.3489, 39.3651],
            [-120.3491, 39.3655],  // Castle Peak summit 9,103 ft (PeakBagger)
          ],
        },
      },
    },
  ],
  terrain_traps: [
    {
      type: 'gully',
      location: [-120.3498, 39.3600],
      description:
        'Narrow gully below the south couloir funnels avalanche debris into a confined ' +
        'runout zone. Avoid lingering in this area during unstable conditions.',
    },
    {
      type: 'dense_trees',
      location: [-120.3479, 39.3532],
      description:
        'Dense tree band below the NE ridge creates terrain traps that can bury debris ' +
        'and make rescue difficult. Maintain spacing when traveling through this section.',
    },
  ],
  overhead_hazards: [
    {
      type: 'cornice',
      location: [-120.3491, 39.3655],
      description:
        'Cornices form along the summit ridge, primarily on the NE side. These threaten ' +
        'the upper NE ridge approach and can release large blocks without warning, ' +
        'especially during warming events.',
    },
    {
      type: 'avalanche_path',
      location: [-120.3482, 39.3596],
      description:
        'Avalanche paths on the east face run above the standard route approach. ' +
        'These paths can produce large slides that reach the skin track during ' +
        'high-hazard periods.',
    },
  ],
  escape_routes: [
    'Descend NE ridge back to trailhead via approach route.',
    'Bail right (south) to Basin Peak saddle and descend to PCT, then follow PCT back to trailhead.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Castle Peak / Donner Summit Sno-Park', elevation_m: 2134 },
    geometry: { type: 'Point', coordinates: [-120.3440, 39.3399] },
  },
  nearest_snotel: [{ id: '541:CA:SNTL', name: 'Independence Lake', elevation_m: 2542 }],
  parking: {
    capacity: '~30 cars',
    fills_by: '8-9am on weekends',
    permit: 'California Sno-Park permit required ($15/day or $40/season)',
    notes:
      'Donner Summit Sno-Park at I-80 exit 176 (Castle Peak / Boreal Ridge). Walk west toward ' +
      'the I-80 underpass, cross under the interstate, and reach the Castle Peak summer road on ' +
      'the north side. Lot is shared with snowmobilers and sledders. Arrive early on weekends.',
  },
  seasonal_notes:
    'Standard NE ridge route is typically skiable December through April with reliable ' +
    'snowpack. The south couloir is best in spring (March through May) after the snowpack ' +
    'has consolidated and corn cycles are established.',
  cell_coverage: 'Intermittent cell service at the trailhead. No coverage beyond the first mile.',
  sar_jurisdiction: 'Placer County SAR',
};
