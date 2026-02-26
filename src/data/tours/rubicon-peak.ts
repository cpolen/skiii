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
            [-120.1230, 39.0105],  // Highland Drive dead end (Powder Project: 39.010453, -120.123007)
            [-120.1234, 39.0100],
            [-120.1238, 39.0095],
            [-120.1242, 39.0090],  // Heading SW into Lonely Gulch
            [-120.1246, 39.0084],
            [-120.1250, 39.0078],
            [-120.1254, 39.0072],
            [-120.1258, 39.0066],
            [-120.1262, 39.0060],  // Climbing through old-growth forest
            [-120.1266, 39.0054],
            [-120.1270, 39.0048],
            [-120.1274, 39.0042],
            [-120.1278, 39.0035],
            [-120.1282, 39.0028],
            [-120.1286, 39.0021],
            [-120.1290, 39.0014],  // Mid-route, steepening
            [-120.1294, 39.0006],
            [-120.1298, 38.9998],
            [-120.1302, 38.9990],
            [-120.1306, 38.9982],
            [-120.1310, 38.9974],
            [-120.1314, 38.9966],  // Upper mountain
            [-120.1318, 38.9958],
            [-120.1322, 38.9950],
            [-120.1326, 38.9942],
            [-120.1328, 38.9934],
            [-120.1330, 38.9926],
            [-120.1332, 38.9918],  // Approaching summit ridge
            [-120.1334, 38.9910],
            [-120.1335, 38.9902],
            [-120.1336, 38.9894],
            [-120.1336, 38.9885],  // Rubicon Peak summit 9,183 ft (PeakVisor/Tahoe Ogul)
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
    { type: 'dense_trees', location: [-120.1262, 39.0060], description: 'Dense old-growth forest creates tree well hazards, especially during and after heavy snowfall.' },
    { type: 'gully', location: [-120.1322, 38.9950], description: 'Gully features on the upper mountain funnel avalanche debris into confined areas.' },
  ],
  overhead_hazards: [
    { type: 'cornice', location: [-120.1336, 38.9885], description: 'Small cornices form along the summit ridge on leeward aspects.' },
    { type: 'avalanche_path', location: [-120.1334, 38.9910], description: 'Avalanche paths on the N and NE face above treeline can produce large slides during instability.' },
  ],
  escape_routes: [
    'Retrace route NE back to Highland Drive — straightforward navigation through the trees.',
    'Traverse south toward the Maggies Peaks area to access lower-angle terrain.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Highland Drive (Top of Highview Dr)', elevation_m: 2070 },
    geometry: { type: 'Point', coordinates: [-120.1230, 39.0105] },
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
