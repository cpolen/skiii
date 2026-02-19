export type GearCategory = 'essential' | 'weather' | 'safety';
export type GearPosition = 'head' | 'torso' | 'legs' | 'feet' | 'hands' | 'pack' | 'ski';

export interface GearItem {
  id: string;
  name: string;
  category: GearCategory;
  position: GearPosition;
  active: boolean;
  reason: string;
}

interface GearConditions {
  tempF: number;
  windMph: number;
  precipitating: boolean;
  isSnowing: boolean;
  isRaining: boolean;
  visibility: number; // meters
  hasSteepBootpack: boolean;
  tourHours: number;
}

/**
 * Generate gear recommendations based on current/forecast conditions.
 * Returns all items — `active` indicates condition-driven items to highlight.
 */
export function getGearRecommendations(conditions: GearConditions): GearItem[] {
  const { tempF, windMph, precipitating, isSnowing, isRaining, hasSteepBootpack, tourHours } =
    conditions;

  const isCold = tempF < 20;
  const isWarm = tempF > 35;
  const isWindy = windMph >= 15;
  const isVeryWindy = windMph >= 25;
  const isLongTour = tourHours > 5;

  const items: GearItem[] = [
    // Essential safety — always active
    {
      id: 'beacon',
      name: 'Avalanche Beacon',
      category: 'essential',
      position: 'torso',
      active: true,
      reason: 'Always carry in avalanche terrain',
    },
    {
      id: 'probe',
      name: 'Probe',
      category: 'essential',
      position: 'pack',
      active: true,
      reason: 'Always carry in avalanche terrain',
    },
    {
      id: 'shovel',
      name: 'Shovel',
      category: 'essential',
      position: 'pack',
      active: true,
      reason: 'Always carry in avalanche terrain',
    },
    {
      id: 'helmet',
      name: 'Helmet',
      category: 'essential',
      position: 'head',
      active: true,
      reason: 'Protection from falls and overhead hazards',
    },
    {
      id: 'skis',
      name: 'Touring Skis',
      category: 'essential',
      position: 'ski',
      active: true,
      reason: 'Primary travel equipment',
    },
    {
      id: 'skins',
      name: 'Climbing Skins',
      category: 'essential',
      position: 'ski',
      active: true,
      reason: 'Uphill traction',
    },
    {
      id: 'poles',
      name: 'Poles',
      category: 'essential',
      position: 'hands',
      active: true,
      reason: 'Balance and propulsion',
    },
    {
      id: 'boots',
      name: 'AT Boots',
      category: 'essential',
      position: 'feet',
      active: true,
      reason: 'Touring-compatible boots',
    },
    {
      id: 'communicator',
      name: 'Satellite Communicator',
      category: 'essential',
      position: 'pack',
      active: true,
      reason: 'Emergency communication where no cell service',
    },

    // Head — condition-dependent
    {
      id: 'goggles',
      name: 'Goggles',
      category: 'weather',
      position: 'head',
      active: precipitating || isWindy || isSnowing,
      reason: precipitating
        ? 'Precipitation expected'
        : isWindy
          ? `Wind ${windMph} mph — eye protection`
          : 'Standard eye protection',
    },
    {
      id: 'sunglasses',
      name: 'Sunglasses',
      category: 'weather',
      position: 'head',
      active: !precipitating && !isWindy,
      reason: 'UV protection at elevation',
    },
    {
      id: 'balaclava',
      name: 'Balaclava',
      category: 'weather',
      position: 'head',
      active: isCold || isVeryWindy,
      reason: isCold ? `Cold conditions (${Math.round(tempF)}°F)` : `Strong wind (${windMph} mph)`,
    },
    {
      id: 'sunscreen',
      name: 'Sunscreen + Lip Balm',
      category: 'weather',
      position: 'head',
      active: true,
      reason: 'Always needed at Sierra elevations',
    },

    // Torso layers
    {
      id: 'base-layer',
      name: 'Merino Base Layer',
      category: 'weather',
      position: 'torso',
      active: true,
      reason: 'Moisture management',
    },
    {
      id: 'mid-layer',
      name: isCold ? 'Heavyweight Fleece' : 'Lightweight Fleece',
      category: 'weather',
      position: 'torso',
      active: true,
      reason: isCold ? 'Extra insulation for cold temps' : 'Active insulation',
    },
    {
      id: 'puffy',
      name: 'Down/Synthetic Puffy',
      category: 'weather',
      position: 'torso',
      active: isCold || isLongTour,
      reason: isCold
        ? `Cold conditions — needed for stops (${Math.round(tempF)}°F)`
        : 'Insulation for stops on long tour',
    },
    {
      id: 'hardshell',
      name: 'Hardshell Jacket',
      category: 'weather',
      position: 'torso',
      active: precipitating || isWindy,
      reason: precipitating
        ? 'Precipitation expected'
        : `Wind protection (${windMph} mph)`,
    },
    {
      id: 'wind-layer',
      name: 'Wind Shirt',
      category: 'weather',
      position: 'torso',
      active: isWindy && !precipitating,
      reason: `Wind ${windMph} mph on ridgeline`,
    },

    // Legs
    {
      id: 'base-legs',
      name: isCold ? 'Heavyweight Baselayer Bottoms' : 'Lightweight Baselayer',
      category: 'weather',
      position: 'legs',
      active: true,
      reason: 'Lower body base',
    },
    {
      id: 'shell-pants',
      name: 'Shell Pants',
      category: 'weather',
      position: 'legs',
      active: precipitating || isWindy || isRaining,
      reason: precipitating ? 'Precipitation protection' : 'Wind/weather protection',
    },

    // Hands
    {
      id: 'gloves',
      name: isCold ? 'Insulated Gloves' : 'Lightweight Touring Gloves',
      category: 'weather',
      position: 'hands',
      active: true,
      reason: isCold ? `Heavy insulation for ${Math.round(tempF)}°F` : 'Standard hand protection',
    },
    {
      id: 'spare-gloves',
      name: 'Spare Gloves',
      category: 'weather',
      position: 'pack',
      active: isCold || precipitating,
      reason: 'Backup if primary gets wet',
    },

    // Ski equipment
    {
      id: 'ski-crampons',
      name: 'Ski Crampons',
      category: 'weather',
      position: 'ski',
      active: isCold && !isSnowing,
      reason: 'Firm/icy conditions expected — cold without new snow',
    },
    {
      id: 'boot-crampons',
      name: 'Boot Crampons + Ice Axe',
      category: 'safety',
      position: 'pack',
      active: hasSteepBootpack,
      reason: 'Steep bootpack sections on this route',
    },
    {
      id: 'skin-wax',
      name: 'Skin Wax/Glop Stopper',
      category: 'weather',
      position: 'pack',
      active: tempF > 25,
      reason: `Warm temps (${Math.round(tempF)}°F) — Sierra cement will glop skins`,
    },

    // Pack items
    {
      id: 'headlamp',
      name: 'Headlamp',
      category: 'safety',
      position: 'pack',
      active: isLongTour,
      reason: isLongTour ? 'Long tour — may finish near sunset' : 'Emergency lighting',
    },
    {
      id: 'food-water',
      name: isLongTour ? 'Extra Food + 2L Water' : 'Snacks + 1L Water',
      category: 'essential',
      position: 'pack',
      active: true,
      reason: isLongTour ? 'Extended effort + cold exposure' : 'Standard nutrition',
    },
    {
      id: 'repair-kit',
      name: 'Repair Kit',
      category: 'safety',
      position: 'pack',
      active: true,
      reason: 'Multi-tool, spare screws, duct tape, zip ties',
    },
    {
      id: 'first-aid',
      name: 'First Aid Kit',
      category: 'safety',
      position: 'pack',
      active: true,
      reason: 'Basic backcountry first aid',
    },
  ];

  return items;
}
