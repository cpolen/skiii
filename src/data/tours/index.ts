import type { Tour } from '@/lib/types/tour';
import { castlePeak } from './castle-peak';
import { chickadeeRidge } from './chickadee-ridge';
import { inclinePeak } from './incline-peak';
import { jakesPeak } from './jakes-peak';
import { mountTallac } from './mount-tallac';
import { tamarackPeak } from './tamarack-peak';
import { rubiconPeak } from './rubicon-peak';

export const tours: Tour[] = [
  castlePeak,
  chickadeeRidge,
  inclinePeak,
  mountTallac,
  jakesPeak,
  rubiconPeak,
  tamarackPeak,
];

export function getTourBySlug(slug: string): Tour | undefined {
  return tours.find((t) => t.slug === slug);
}
