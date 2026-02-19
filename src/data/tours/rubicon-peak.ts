import type { Tour } from '@/lib/types/tour';

export const rubiconPeak: Tour = {
  slug: 'rubicon-peak',
  name: 'Rubicon Peak',
  variants: [
    {
      name: 'Highland Drive (Standard)',
      slope_angle_max: 35,
      slope_angle_avg: 25,
      primary_aspects: ['NE', 'N', 'E'],
      route: {
        type: 'Feature',
        properties: { name: 'Highland Drive (Standard)', difficulty: 'advanced' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.1085, 39.0090],
            [-120.1090, 39.0086],
            [-120.1095, 39.0082],
            [-120.1100, 39.0078],
            [-120.1106, 39.0074],
            [-120.1112, 39.0070],
            [-120.1118, 39.0066],
            [-120.1124, 39.0062],
            [-120.1130, 39.0058],
            [-120.1135, 39.0054],
            [-120.1140, 39.0050],
            [-120.1145, 39.0046],
            [-120.1148, 39.0042],
            [-120.1152, 39.0038],
            [-120.1156, 39.0034],
            [-120.1160, 39.0030],
            [-120.1164, 39.0026],
            [-120.1168, 39.0022],
            [-120.1172, 39.0018],
            [-120.1176, 39.0014],
            [-120.1180, 39.0110],
            [-120.1184, 39.0106],
            [-120.1188, 39.0102],
            [-120.1192, 39.0098],
            [-120.1196, 39.0094],
            [-120.1200, 39.0090],
            [-120.1206, 39.0086],
            [-120.1212, 39.0082],
            [-120.1218, 39.0078],
            [-120.1224, 39.0074],
            [-120.1230, 39.0105],
          ],
        },
      },
    },
  ],
  description:
    'Rubicon Peak (9,183ft) is a storm-day paradise on the West Shore of Lake Tahoe. ' +
    'Entirely covered by well-spaced old-growth trees, the mountain offers exceptional tree ' +
    'skiing from the summit all the way back to the trailhead. Access from Highland Drive ' +
    'saves 600ft of skinning compared to Highway 89. Navigation is straightforward — head ' +
    'west/southwest and up. NE and N aspects hold cold snow well throughout the season.',
  difficulty: 'advanced',
  ates_rating: 'challenging',
  distance_km: 6.1,
  elevation_gain_m: 730,
  elevation_loss_m: 730,
  max_elevation_m: 2799,
  min_elevation_m: 2070,
  estimated_hours_range: [3, 5],
  transition_count: 1,
  terrain_traps: [
    { type: 'dense_trees', location: [-120.1145, 39.0046], description: 'Dense old-growth forest creates tree well hazards, especially during and after heavy snowfall.' },
    { type: 'gully', location: [-120.1200, 39.0090], description: 'Gully features on the N face funnel avalanche debris into confined areas.' },
  ],
  overhead_hazards: [
    { type: 'cornice', location: [-120.1230, 39.0105], description: 'Small cornices form along the summit ridge on leeward aspects.' },
    { type: 'avalanche_path', location: [-120.1212, 39.0082], description: 'Avalanche paths on the N and NE face above treeline can produce large slides during instability.' },
  ],
  escape_routes: [
    'Retrace route NE back to Highland Drive — straightforward navigation through the trees.',
    'Traverse south toward the Maggies Peaks area to access lower-angle terrain.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Highland Drive (Top of Highview Dr)', elevation_m: 2070 },
    geometry: { type: 'Point', coordinates: [-120.1085, 39.0090] },
  },
  nearest_snotel: [{ id: '724:CA:SNTL', name: 'Rubicon #2', elevation_m: 2042 }],
  parking: {
    capacity: '10-12 cars',
    fills_by: 'Early on weekends',
    permit: 'None required',
    notes:
      'Park at the dead end of Highland Drive for the shortest approach. Roads connecting ' +
      'Highland Drive to Highway 89 are steep with sharp turns and can be icy — chains or ' +
      '4WD may be needed. Alternatively, park at pullouts on Highway 89 (adds ~600ft of skinning).',
  },
  seasonal_notes:
    'Best December through March. Storm-day paradise — well-spaced old-growth trees provide ' +
    'excellent skiing in low visibility. NE aspects hold cold snow well.',
  cell_coverage: 'Good at trailhead near the neighborhood. Coverage lost within approximately 0.5 miles.',
  sar_jurisdiction: 'El Dorado County SAR',
};
