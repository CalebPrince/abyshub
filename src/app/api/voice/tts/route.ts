import { NextResponse } from "next/server";

import { callerKey, rateLimit } from "@/lib/rate-limit";
import { forSpeech } from "@/lib/chat/speech-text";
import { getSecret, getShopSettings } from "@/lib/shop/settings";

/**
 * Speaks one of Lisa's replies, without the ElevenLabs key ever reaching a
 * browser.
 *
 * The endpoint is deliberately public — the shop's chat widget is public, and
 * requiring a session to hear a reply you can already read would be theatre.
 * What keeps that safe is the pair of ceilings below: a per-caller rate limit,
 * and a hard cap on how much text one call may synthesise. Both exist because
 * this is the only route in the shop where an anonymous request spends money.
 */

/** Long enough for Lisa's conversational replies, short enough to be cheap. */
const MAX_TEXT_LENGTH = 700;

const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const limit = rateLimit(callerKey(request, "tts"), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const [settings, apiKey] = await Promise.all([
    getShopSettings(),
    getSecret("elevenlabs_api_key", process.env.ELEVENLABS_API_KEY),
  ]);

  // 503 rather than 500: nothing is broken, the shop simply has no voice
  // configured. The client reads this as "stay on the browser voice" and stops
  // asking, which is why it must not be an error status.
  if (!apiKey || !settings.voice.id) {
    return NextResponse.json(
      { error: "Natural speech is not configured." },
      { status: 503 }
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const raw = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Text is required." }, { status: 422 });
  }

  // Truncated rather than refused: the client already trims to this length, so
  // reaching it means something unusual, and a shortened answer read aloud
  // beats silence with an error nobody sees. The widget has also already run
  // the speech pipeline — running it again is the endpoint keeping its own
  // promise rather than trusting its callers.
  const text = forSpeech(raw.slice(0, MAX_TEXT_LENGTH));

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        settings.voice.id
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: settings.voice.model,
          voice_settings: {
            stability: 0.48,
            similarity_boost: 0.78,
            style: 0.18,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
  } catch (error) {
    console.error("[voice] elevenlabs unreachable", error);
    return NextResponse.json(
      { error: "Natural speech is temporarily unavailable." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    // The body carries the actual reason — a voice ID that no longer exists,
    // an exhausted quota — and none of it is guessable from the status alone.
    const detail = await upstream.text().catch(() => "");
    console.error(
      `[voice] elevenlabs refused: HTTP ${upstream.status} voice=${settings.voice.id} ${detail.slice(0, 500)}`
    );
    return NextResponse.json(
      { error: "Natural speech is temporarily unavailable." },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      // Private and unstored: this is one customer's conversation read aloud,
      // and it has no business sitting in a shared cache.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
