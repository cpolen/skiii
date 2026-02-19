import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Find the start and end positions of the Nth `coordinates: [...]` block in source text.
 * Uses bracket-depth counting to handle nested arrays and inline comments.
 * Returns [startOfOpenBracket, endOfCloseBracket+1] or null.
 */
function findCoordinatesBlock(content: string, n: number): [number, number] | null {
  let found = -1;
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const idx = content.indexOf('coordinates:', searchFrom);
    if (idx === -1) return null;

    // Find the opening bracket after "coordinates:"
    const openBracket = content.indexOf('[', idx + 'coordinates:'.length);
    if (openBracket === -1) return null;

    found++;
    if (found === n) {
      // Count bracket depth to find matching close bracket
      let depth = 0;
      for (let i = openBracket; i < content.length; i++) {
        if (content[i] === '[') depth++;
        if (content[i] === ']') {
          depth--;
          if (depth === 0) {
            return [openBracket, i + 1];
          }
        }
      }
      return null; // unbalanced brackets
    }

    // Skip past this block for the next search
    searchFrom = openBracket + 1;
  }

  return null;
}

/**
 * Find the trailhead coordinates: [...] block.
 * Looks for "trailhead:" then the "coordinates:" inside it.
 */
function findTrailheadCoordinates(content: string): [number, number] | null {
  const trailheadIdx = content.indexOf('trailhead:');
  if (trailheadIdx === -1) return null;

  const coordsIdx = content.indexOf('coordinates:', trailheadIdx);
  if (coordsIdx === -1) return null;

  // Make sure this coordinates: is within the trailhead block (not some later block)
  // Check that there's no closing `}` between trailhead: and this coordinates:
  const between = content.slice(trailheadIdx, coordsIdx);
  // Count braces to ensure we're still inside the trailhead object
  let braceDepth = 0;
  for (const ch of between) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (braceDepth < 0) return null; // exited the trailhead block
  }

  const openBracket = content.indexOf('[', coordsIdx + 'coordinates:'.length);
  if (openBracket === -1) return null;

  // This is a simple [lng, lat] array, not nested — find closing bracket
  const closeBracket = content.indexOf(']', openBracket);
  if (closeBracket === -1) return null;

  return [openBracket, closeBracket + 1];
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const { slug, variantIndex, coordinates } = await req.json();

  if (!slug || variantIndex == null || !Array.isArray(coordinates)) {
    return NextResponse.json({ error: 'Missing slug, variantIndex, or coordinates' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'src', 'data', 'tours', `${slug}.ts`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Format new route coordinates
  const formatted = coordinates
    .map(([lng, lat]: [number, number]) => `            [${lng.toFixed(4)}, ${lat.toFixed(4)}],`)
    .join('\n');

  // 1. Replace the route coordinates block for the target variant
  const routeBlock = findCoordinatesBlock(content, variantIndex);
  if (!routeBlock) {
    return NextResponse.json(
      { error: `Could not find coordinates block at variant index ${variantIndex}` },
      { status: 400 },
    );
  }

  const newRouteBlock = `[\n${formatted}\n          ]`;
  content = content.slice(0, routeBlock[0]) + newRouteBlock + content.slice(routeBlock[1]);

  // 2. Update the trailhead coordinates to match the new first route point
  const firstPoint = coordinates[0];
  if (firstPoint) {
    const trailheadBlock = findTrailheadCoordinates(content);
    if (trailheadBlock) {
      const newTrailhead = `[${firstPoint[0].toFixed(4)}, ${firstPoint[1].toFixed(4)}]`;
      content = content.slice(0, trailheadBlock[0]) + newTrailhead + content.slice(trailheadBlock[1]);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return NextResponse.json({ path: `src/data/tours/${slug}.ts`, variantIndex });
}
