import type { Tour } from '@/lib/types/tour';

export const jakesPeak: Tour = {
  slug: 'jakes-peak',
  name: "Jake's Peak",
  variants: [
    {
      name: 'NE Face (Standard)',
      slope_angle_max: 38,
      slope_angle_avg: 28,
      primary_aspects: ['NE', 'N', 'E'],
      route: {
        type: 'Feature',
        properties: { name: 'NE Face (Standard)', difficulty: 'advanced' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.1050, 38.9545],
            [-120.1055, 38.9540],
            [-120.1062, 38.9534],
            [-120.1068, 38.9528],
            [-120.1072, 38.9522],
            [-120.1076, 38.9516],
            [-120.1080, 38.9510],
            [-120.1084, 38.9504],
            [-120.1088, 38.9498],
            [-120.1092, 38.9492],
            [-120.1096, 38.9486],
            [-120.1100, 38.9480],
            [-120.1104, 38.9474],
            [-120.1108, 38.9468],
            [-120.1112, 38.9462],
            [-120.1116, 38.9456],
            [-120.1120, 38.9450],
            [-120.1124, 38.9444],
            [-120.1128, 38.9438],
            [-120.1132, 38.9432],
            [-120.1138, 38.9426],
            [-120.1142, 38.9420],
            [-120.1148, 38.9414],
            [-120.1154, 38.9408],
            [-120.1160, 38.9402],
            [-120.1165, 38.9396],
            [-120.1170, 38.9390],
            [-120.1174, 38.9384],
            [-120.1178, 38.9378],
            [-120.1180, 38.9372],
            [-120.1181, 38.9367],
          ],
        },
      },
    },
  ],
  description:
    "Jake's Peak (9,187ft) is a classic West Shore backcountry ski destination above " +
    'Emerald Bay. Named in honor of Jake Smith, a ski patroller who died in an avalanche at ' +
    'Alpine Meadows in 1982. The tour climbs 2,300ft in just over a mile through dense forest ' +
    'before reaching exposed NE-facing terrain with sustained steep skiing. The short but steep ' +
    'skin with a fall-line approach makes this a Tahoe classic when conditions align.',
  difficulty: 'advanced',
  ates_rating: 'complex',
  distance_km: 3.8,
  elevation_gain_m: 700,
  elevation_loss_m: 700,
  max_elevation_m: 2800,
  min_elevation_m: 2100,
  estimated_hours_range: [3, 5],
  transition_count: 1,
  terrain_traps: [
    { type: 'cliff', location: [-120.1174, 38.9384], description: 'Cliff bands on the east face below the summit create high-consequence terrain traps.' },
    { type: 'dense_trees', location: [-120.1096, 38.9486], description: 'Dense forest on the lower mountain creates tree well hazards, especially during and after heavy snowfall.' },
  ],
  overhead_hazards: [
    { type: 'cornice', location: [-120.1181, 38.9367], description: 'Cornices form along the summit ridge, especially on leeward (NE) aspects.' },
    { type: 'avalanche_path', location: [-120.1170, 38.9390], description: 'Multiple avalanche paths converge on the NE face above the standard route.' },
  ],
  escape_routes: [
    'Retrace route back to Hwy 89 pullout via the skin track.',
    'If above treeline, descend south to lower-angle terrain before regaining the approach.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: "Jake's Peak Pullout (Hwy 89)", elevation_m: 2100 },
    geometry: { type: 'Point', coordinates: [-120.1050, 38.9545] },
  },
  nearest_snotel: [
    { id: '473:CA:SNTL', name: 'Fallen Leaf', elevation_m: 1905 },
    { id: '724:CA:SNTL', name: 'Rubicon #2', elevation_m: 2042 },
  ],
  parking: {
    capacity: '8-10 cars',
    fills_by: 'Early on weekends',
    permit: 'None required',
    notes:
      'Small pullout on Hwy 89 between Emerald Bay and D.L. Bliss State Park. Recent CalTrans ' +
      'construction reduced pullout size. Overflow at Bayview or D.L. Bliss upper entrance lot. ' +
      'SR 89 closes after heavy snow due to avalanches — check CalTrans.',
  },
  seasonal_notes:
    'Best December through March. NE aspects hold cold snow well. Summit bootpack typically required.',
  cell_coverage: 'Good at trailhead (West Shore). No coverage above approximately 7,500ft.',
  sar_jurisdiction: 'El Dorado County SAR',
};
