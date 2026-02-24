import { NextRequest, NextResponse } from 'next/server';

/**
 * AI-enhanced guide message endpoint.
 * Accepts context about current conditions and returns a natural-language
 * 2-3 sentence briefing from Claude Haiku.
 *
 * Gracefully degrades: returns { message: null } when no API key is configured
 * or on any error, so the client keeps its template message.
 */

const SYSTEM_PROMPT = `You are an experienced backcountry ski guide in the Lake Tahoe / Sierra Nevada region. You're giving a brief heads-up to your touring partner based on current conditions data.

Rules:
- Maximum 2-3 sentences. Be dense with useful information, not filler.
- Reference specific numbers: wind speed, temperature, danger level, score, freezing level, snowfall amounts.
- Be actionable — tell them what to do, where to go, what to avoid, or when to time it.
- Use casual but competent tone — like a trusted ski partner who knows these mountains.
- Never say "be safe" or "stay safe" — be specific about the hazard and what to do about it.
- Never use emoji.
- Never disclaim or hedge — speak confidently from the data.
- Use backcountry ski terminology naturally (skin track, boot pack, spindrift, wind slab, wind loading, aspect, corn window, skin up by, etc.)

Trigger-specific guidance:
- "app-load": Give an overall briefing. Lead with the most important factor (avy danger, weather window, snow quality). Name the best tour and why. If there's a corn window or powder day, highlight the timing.
- "tour-select": Explain this tour's ranking. Call out specific hazards on its aspects (wind slab on NW, terrain traps, overhead hazards). Compare the sub-scores (avy/weather/terrain) to explain what's driving the score. If corn, mention the window timing and when to leave.
- "timeline-scrub": Focus on what's different at this time. Call out specifics: wind picking up, precip starting, temperature crossing freezing, visibility dropping, nighttime. Compare to current conditions when meaningful.

Data interpretation:
- Composite score: 0-100 where 80+ is favorable, 60-80 moderate, 40-60 elevated concern, 20-40 significant, 0-20 serious
- Avy sub-score weights 50% of composite, weather 35%, terrain 15%
- Avy problems listed are specifically on this tour's aspects — they are directly relevant
- Wind direction tells you which aspects are getting loaded (opposite of wind direction)
- Freezing level above tour elevation means rain-on-snow risk
- Corn window times are when conditions are prime; "Leave by" is when to start skinning
- Travel advice is from the Sierra Avalanche Center — reference their guidance when relevant`;

interface GuidePayload {
  trigger: string;
  tourName: string | null;
  tourSlug: string | null;
  rank: number | null;
  totalTours: number;
  forecastHour: number | null;
  conditions: {
    composite: number;
    band: string;
    bandLabel: string;
    reasons: string[];
    avalancheScore: number | null;
    weatherScore: number;
    terrainScore: number;
  } | null;
  snow: {
    type: string;
    label: string;
    detail: string;
    score?: number;
    cornWindowStart?: string;
    cornWindowEnd?: string;
    startBy?: string;
  } | null;
  weather: {
    tempF: number;
    ridgeWindMph: number;
    windDirection: string;
    precipMm: number;
    snowfallCm: number;
    snowfall48hIn: number;
    freezingLevelFt: number;
    visibilityM: number;
    isDay: boolean;
  } | null;
  avy: {
    dangerLevel: number | null;
    problems: string[];
    travelAdvice: string | null;
    bottomLine: string | null;
  } | null;
  terrain: {
    atesRating: string;
    difficulty: string;
    maxSlope: number;
    terrainTraps: string[];
    overheadHazards: string[];
    escapeRoutes: string[];
    aspects: string[];
    elevationRange: string;
  } | null;
}

function formatUserPrompt(payload: GuidePayload): string {
  const lines: string[] = [];
  lines.push(`Trigger: ${payload.trigger}`);

  if (payload.tourName) {
    const rankStr = payload.rank ? ` (ranked #${payload.rank} of ${payload.totalTours})` : '';
    lines.push(`Tour: ${payload.tourName}${rankStr}`);
  }

  if (payload.conditions) {
    const c = payload.conditions;
    lines.push(`Conditions: ${c.composite}/100 (${c.bandLabel})`);
    lines.push(`  Sub-scores: Avalanche ${c.avalancheScore ?? 'N/A'}/100, Weather ${c.weatherScore}/100, Terrain ${c.terrainScore}/100`);
    if (c.reasons.length > 0) {
      lines.push(`  Driving factors: ${c.reasons.join(', ')}`);
    }
  }

  if (payload.snow) {
    const s = payload.snow;
    let snowLine = `Snow: ${s.label} — ${s.detail}`;
    if (s.score != null) snowLine += ` (quality ${s.score}/100)`;
    lines.push(snowLine);
    if (s.cornWindowStart && s.cornWindowEnd) {
      const start = new Date(s.cornWindowStart).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/Los_Angeles' });
      const end = new Date(s.cornWindowEnd).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/Los_Angeles' });
      lines.push(`  Corn window: ${start}–${end}`);
    }
    if (s.startBy) {
      const startBy = new Date(s.startBy).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
      lines.push(`  Skin up by: ${startBy}`);
    }
  }

  if (payload.weather) {
    const w = payload.weather;
    lines.push(`Weather: ${w.tempF}°F, wind ${w.ridgeWindMph} mph from ${w.windDirection}, freezing level ${w.freezingLevelFt.toLocaleString()}', ${w.isDay ? 'daytime' : 'nighttime'}`);
    if (w.precipMm > 0) {
      lines.push(`  Active precip: ${w.precipMm}mm/hr${w.snowfallCm > 0 ? ` (${w.snowfallCm}cm snow)` : ''}`);
    }
    if (w.snowfall48hIn > 0) {
      lines.push(`  48h snowfall: ${w.snowfall48hIn}" accumulated`);
    }
    if (w.visibilityM < 5000) {
      lines.push(`  Visibility: ${Math.round(w.visibilityM)}m (reduced)`);
    }
  }

  if (payload.avy) {
    const a = payload.avy;
    const dangerStr = a.dangerLevel != null ? `Level ${a.dangerLevel}` : 'Off season';
    lines.push(`Avalanche: ${dangerStr}`);
    if (a.problems.length > 0) {
      lines.push(`  Problems on this tour's aspects: ${a.problems.join(', ')}`);
    }
    if (a.travelAdvice) {
      lines.push(`  SAC travel advice: ${a.travelAdvice}`);
    }
    if (a.bottomLine) {
      lines.push(`  SAC bottom line: ${a.bottomLine.slice(0, 300)}`);
    }
  }

  if (payload.terrain) {
    const t = payload.terrain;
    lines.push(`Terrain: ${t.difficulty}, ATES ${t.atesRating}, max slope ${t.maxSlope}°, aspects ${t.aspects.join('/')}, elevation ${t.elevationRange}`);
    if (t.terrainTraps.length > 0) {
      lines.push(`  Terrain traps: ${t.terrainTraps.join('; ')}`);
    }
    if (t.overheadHazards.length > 0) {
      lines.push(`  Overhead hazards: ${t.overheadHazards.join('; ')}`);
    }
    if (t.escapeRoutes.length > 0) {
      lines.push(`  Escape routes: ${t.escapeRoutes.join('; ')}`);
    }
  }

  const instruction = payload.trigger === 'app-load'
    ? 'Give a brief overall conditions briefing for today, highlighting the best tour option and the most important factor to plan around.'
    : payload.trigger === 'tour-select'
      ? 'Explain why this tour ranks where it does. Call out specific hazards, terrain concerns, and what to watch for on this route.'
      : 'Describe how conditions change at this time — what specifically is different and what it means for touring.';

  lines.push('');
  lines.push(instruction);

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: null });
  }

  let body: GuidePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: null }, { status: 400 });
  }

  const userPrompt = formatUserPrompt(body);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ message: null });
    }

    const data = await response.json();
    const message = data.content?.[0]?.text ?? null;
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ message: null });
  }
}
