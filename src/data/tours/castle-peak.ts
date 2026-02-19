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
            [-120.3483, 39.3418],
            [-120.3488, 39.3425],
            [-120.3492, 39.3432],
            [-120.3498, 39.3441],
            [-120.3505, 39.3450],
            [-120.3512, 39.3458],
            [-120.3520, 39.3466],
            [-120.3528, 39.3474],
            [-120.3535, 39.3483],
            [-120.3540, 39.3492],
            [-120.3545, 39.3502],
            [-120.3548, 39.3512],
            [-120.3550, 39.3522],
            [-120.3548, 39.3532],
            [-120.3545, 39.3542],
            [-120.3540, 39.3550],
            [-120.3535, 39.3558],
            [-120.3530, 39.3565],
            [-120.3528, 39.3573],
            [-120.3525, 39.3580],
            [-120.3523, 39.3588],
            [-120.3522, 39.3596],
            [-120.3520, 39.3604],
            [-120.3518, 39.3612],
            [-120.3518, 39.3620],
            [-120.3520, 39.3628],
            [-120.3522, 39.3636],
            [-120.3524, 39.3644],
            [-120.3525, 39.3652],
            [-120.3525, 39.3660],
            [-120.3525, 39.3667],
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
            [-120.3483, 39.3418],
            [-120.3488, 39.3425],
            [-120.3492, 39.3432],
            [-120.3498, 39.3441],
            [-120.3505, 39.3450],
            [-120.3512, 39.3458],
            [-120.3520, 39.3466],
            [-120.3528, 39.3474],
            [-120.3535, 39.3483],
            [-120.3540, 39.3492],
            [-120.3545, 39.3502],
            [-120.3548, 39.3512],
            [-120.3550, 39.3522],
            [-120.3548, 39.3532],
            [-120.3545, 39.3542],
            [-120.3540, 39.3550],
            [-120.3538, 39.3558],
            [-120.3540, 39.3566],
            [-120.3545, 39.3575],
            [-120.3548, 39.3585],
            [-120.3545, 39.3595],
            [-120.3542, 39.3605],
            [-120.3538, 39.3615],
            [-120.3535, 39.3625],
            [-120.3532, 39.3635],
            [-120.3530, 39.3645],
            [-120.3528, 39.3655],
            [-120.3525, 39.3667],
          ],
        },
      },
    },
  ],
  terrain_traps: [
    {
      type: 'gully',
      location: [-120.3542, 39.3605],
      description:
        'Narrow gully below the south couloir funnels avalanche debris into a confined ' +
        'runout zone. Avoid lingering in this area during unstable conditions.',
    },
    {
      type: 'dense_trees',
      location: [-120.3548, 39.3532],
      description:
        'Dense tree band below the NE ridge creates terrain traps that can bury debris ' +
        'and make rescue difficult. Maintain spacing when traveling through this section.',
    },
  ],
  overhead_hazards: [
    {
      type: 'cornice',
      location: [-120.3525, 39.3660],
      description:
        'Cornices form along the summit ridge, primarily on the NE side. These threaten ' +
        'the upper NE ridge approach and can release large blocks without warning, ' +
        'especially during warming events.',
    },
    {
      type: 'avalanche_path',
      location: [-120.3522, 39.3596],
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
    geometry: { type: 'Point', coordinates: [-120.3483, 39.3418] },
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
