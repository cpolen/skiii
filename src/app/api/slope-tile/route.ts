import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Slope Tile API — computes true slope angles from Mapbox Terrain-RGB DEM tiles.
 *
 * Flow:
 * 1. Fetch the Mapbox Terrain-RGB tile for the requested {z}/{x}/{y}
 * 2. Decode RGB → elevation using Mapbox formula
 * 3. Compute slope via Horn's method (3×3 weighted finite differences)
 * 4. Color-code each pixel by slope angle (CalTopo/avalanche standard)
 * 5. Return a colored PNG tile
 *
 * The result is view-independent — slope angles are computed from actual
 * elevation differences, not from illumination direction. Camera pitch/bearing
 * has no effect on the colors.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TILE_SIZE = 256;

/** Tile coordinate → latitude of tile center (for cell size computation). */
function tileCenterLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * (y + 0.5)) / Math.pow(2, z);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

/** Ground resolution in meters per pixel at a given latitude and zoom. */
function cellSizeMeters(lat: number, z: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (Math.pow(2, z) * TILE_SIZE);
}

/**
 * CalTopo-style slope angle → RGBA color.
 * Transparent for low angles, green→yellow→orange→red→pink→purple for steeper.
 */
function slopeToColor(degrees: number): [number, number, number, number] {
  if (degrees < 25) return [0, 0, 0, 0];             // transparent — low angle
  if (degrees < 30) return [76, 175, 80, 170];        // green
  if (degrees < 35) return [255, 235, 59, 180];       // yellow
  if (degrees < 40) return [255, 152, 0, 200];        // orange — prime avy zone
  if (degrees < 45) return [244, 67, 54, 210];        // red
  if (degrees < 50) return [233, 30, 99, 210];        // dark red / pink
  return [156, 39, 176, 200];                          // purple — extreme
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const z = parseInt(searchParams.get('z') ?? '', 10);
  const x = parseInt(searchParams.get('x') ?? '', 10);
  const y = parseInt(searchParams.get('y') ?? '', 10);

  if (!MAPBOX_TOKEN || isNaN(z) || isNaN(x) || isNaN(y)) {
    return NextResponse.json({ error: 'Missing z/x/y params or Mapbox token' }, { status: 400 });
  }

  // Clamp zoom to DEM max
  const clampedZ = Math.min(z, 15);

  try {
    // Fetch the Terrain-RGB tile from Mapbox
    const tileUrl = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${clampedZ}/${x}/${y}.pngraw?access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(tileUrl, { next: { revalidate: 86400 } }); // 24h cache

    if (!res.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Decode PNG → raw RGBA pixels
    const { data: pixels, info } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;

    // Decode all pixels to elevation (meters)
    const elev = new Float32Array(w * h);
    for (let i = 0; i < elev.length; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      elev[i] = -10000 + (r * 65536 + g * 256 + b) * 0.1;
    }

    // Compute cell size in meters for this tile
    const lat = tileCenterLat(y, clampedZ);
    const cell = cellSizeMeters(lat, clampedZ);

    // Output buffer — same size, RGBA
    const out = Buffer.alloc(w * h * 4);

    // Horn's method: compute slope for each interior pixel
    const RAD_TO_DEG = 180 / Math.PI;
    for (let row = 1; row < h - 1; row++) {
      for (let col = 1; col < w - 1; col++) {
        // 3×3 kernel:  a b c
        //              d e f
        //              g h i
        const a = elev[(row - 1) * w + (col - 1)];
        const b = elev[(row - 1) * w + col];
        const c = elev[(row - 1) * w + (col + 1)];
        const d = elev[row * w + (col - 1)];
        const f = elev[row * w + (col + 1)];
        const g = elev[(row + 1) * w + (col - 1)];
        const hv = elev[(row + 1) * w + col];
        const iv = elev[(row + 1) * w + (col + 1)];

        const dzdx = ((c + 2 * f + iv) - (a + 2 * d + g)) / (8 * cell);
        const dzdy = ((g + 2 * hv + iv) - (a + 2 * b + c)) / (8 * cell);
        const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * RAD_TO_DEG;

        const [r, gn, bl, alpha] = slopeToColor(slopeDeg);
        const px = (row * w + col) * 4;
        out[px] = r;
        out[px + 1] = gn;
        out[px + 2] = bl;
        out[px + 3] = alpha;
      }
    }
    // Edge pixels (row 0, row h-1, col 0, col w-1) stay transparent (all zeros)

    // Encode back to PNG
    const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 6 })
      .toBuffer();

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
