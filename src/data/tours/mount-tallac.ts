import type { Tour } from '@/lib/types/tour';

export const mountTallac: Tour = {
  slug: 'mount-tallac',
  name: 'Mount Tallac',
  description:
    'Mount Tallac is one of the most iconic backcountry ski tours in the Lake Tahoe region, ' +
    'rising prominently above the West Shore of South Lake Tahoe to 9,735ft. The massive NE ' +
    'bowl offers sustained steep skiing visible from much of the Tahoe Basin, while the Cross ' +
    'face via Floating Island Lake provides a longer, more moderate alternative. Large ' +
    'avalanche paths, cliff bands, and exposed alpine terrain demand advanced skills and ' +
    'careful assessment. Summit views encompass Desolation Wilderness, Fallen Leaf Lake, ' +
    'and the full expanse of Lake Tahoe.',
  difficulty: 'advanced',
  ates_rating: 'complex',
  distance_km: 5.5,
  elevation_gain_m: 1050,
  elevation_loss_m: 1050,
  max_elevation_m: 2967,
  min_elevation_m: 1920,
  estimated_hours_range: [5, 7],
  transition_count: 1,
  variants: [
    {
      name: 'NE Bowl (Standard)',
      slope_angle_max: 40,
      slope_angle_avg: 30,
      primary_aspects: ['NE', 'N'],
      route: {
        type: 'Feature',
        properties: { name: 'NE Bowl (Standard)', difficulty: 'advanced' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.0555, 38.9215],
            [-120.0560, 38.9210],
            [-120.0568, 38.9205],
            [-120.0578, 38.9198],
            [-120.0590, 38.9192],
            [-120.0602, 38.9186],
            [-120.0615, 38.9180],
            [-120.0628, 38.9174],
            [-120.0640, 38.9168],
            [-120.0652, 38.9160],
            [-120.0662, 38.9152],
            [-120.0670, 38.9143],
            [-120.0678, 38.9134],
            [-120.0685, 38.9124],
            [-120.0692, 38.9114],
            [-120.0698, 38.9104],
            [-120.0705, 38.9094],
            [-120.0712, 38.9084],
            [-120.0718, 38.9074],
            [-120.0724, 38.9064],
            [-120.0730, 38.9054],
            [-120.0735, 38.9044],
            [-120.0740, 38.9035],
            [-120.0745, 38.9026],
            [-120.0750, 38.9018],
            [-120.0755, 38.9010],
            [-120.0760, 38.9002],
            [-120.0764, 38.8994],
            [-120.0764, 38.8988],
            [-120.0764, 38.8982],
            [-120.0764, 38.8975],
            [-120.0764, 38.8968],
          ],
        },
      },
    },
    {
      name: 'Cross (via Floating Island Lake)',
      slope_angle_max: 35,
      slope_angle_avg: 25,
      primary_aspects: ['N', 'NE', 'E'],
      route: {
        type: 'Feature',
        properties: { name: 'Cross (via Floating Island Lake)', difficulty: 'advanced' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-120.0555, 38.9215],
            [-120.0560, 38.9210],
            [-120.0568, 38.9205],
            [-120.0578, 38.9198],
            [-120.0590, 38.9192],
            [-120.0602, 38.9186],
            [-120.0615, 38.9180],
            [-120.0628, 38.9174],
            [-120.0640, 38.9168],
            [-120.0652, 38.9160],
            [-120.0665, 38.9152],
            [-120.0678, 38.9144],
            [-120.0688, 38.9135],
            [-120.0695, 38.9125],
            [-120.0700, 38.9115],
            [-120.0705, 38.9105],
            [-120.0712, 38.9095],
            [-120.0720, 38.9085],
            [-120.0728, 38.9075],
            [-120.0735, 38.9065],
            [-120.0742, 38.9055],
            [-120.0748, 38.9045],
            [-120.0754, 38.9035],
            [-120.0758, 38.9025],
            [-120.0762, 38.9015],
            [-120.0764, 38.9005],
            [-120.0764, 38.8995],
            [-120.0764, 38.8985],
            [-120.0764, 38.8975],
            [-120.0764, 38.8968],
          ],
        },
      },
    },
  ],
  terrain_traps: [
    {
      type: 'cliff',
      location: [-120.0755, 38.9010],
      description: 'Cliff bands below the summit create significant terrain traps. Avalanche debris and skier falls can funnel over cliffs with high consequence.',
    },
    {
      type: 'creek',
      location: [-120.0698, 38.9104],
      description: 'Cathedral Creek drainage below the NE bowl funnels avalanche debris into a narrow channel. Multiple slide paths converge here.',
    },
    {
      type: 'dense_trees',
      location: [-120.0670, 38.9143],
      description: 'Trees in the lower gulley concentrate slide debris and create entrapment hazards.',
    },
  ],
  overhead_hazards: [
    {
      type: 'cornice',
      location: [-120.0764, 38.8975],
      description: 'Cornices form along the summit ridge above the NE bowl, primarily on the north and northeast sides.',
    },
    {
      type: 'avalanche_path',
      location: [-120.0745, 38.9026],
      description: 'Connected avalanche paths run from the summit ridge to the NE bowl floor. These paths can produce very large slides.',
    },
    {
      type: 'rockfall',
      location: [-120.0742, 38.9055],
      description: 'Rockfall from the Cross face occurs in warm conditions. Most common in afternoon during spring corn cycles.',
    },
  ],
  escape_routes: [
    'Descend east back toward Floating Island Lake and the approach trail to return to the trailhead.',
    'From the NE bowl, skin out to the right (south) to gain the summer trail ridge and descend via the standard approach.',
  ],
  avy_center_id: 'SAC',
  trailhead: {
    type: 'Feature',
    properties: { name: 'Spring Creek Road / Hwy 89 (Winter Trailhead)', elevation_m: 1920 },
    geometry: { type: 'Point', coordinates: [-120.0555, 38.9215] },
  },
  nearest_snotel: [
    { id: '473:CA:SNTL', name: 'Fallen Leaf', elevation_m: 1905 },
    { id: '518:CA:SNTL', name: 'Heavenly Valley', elevation_m: 2652 },
  ],
  parking: {
    capacity: '~20 cars',
    fills_by: '7am on powder days',
    permit: 'No permit required in winter',
    notes:
      'Winter access is from a pullout at the junction of Spring Creek Road and Highway 89, ' +
      'approximately 4 miles north of the South Lake Tahoe "Y" junction (Hwy 50/SR 89). ' +
      'The Forest Service gate on the summer trailhead road is locked November-May. ' +
      'Arrive very early on powder days.',
  },
  seasonal_notes:
    'The NE bowl holds snow from December through April with reliable cold-smoke conditions ' +
    'on north-facing aspects. Spring corn cycles on east and southeast aspects run from March ' +
    'through May. One of the first big tours to fill up on powder days.',
  cell_coverage: 'Good cell coverage at the trailhead. Spotty above Floating Island Lake. No coverage in the NE bowl.',
  sar_jurisdiction: 'El Dorado County SAR',
};
