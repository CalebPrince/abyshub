/**
 * Lisa's voice in the browser.
 *
 * Two engines, in order: the real ElevenLabs voice through the shop's own
 * route, and the operating system's `speechSynthesis` when that is
 * unavailable. Ported from the arrangement in prince-web-app, minus its
 * multi-agent handling — this shop has one agent.
 *
 * The state here is module-level on purpose. One shared `<audio>` element
 * means a second reply cannot start while the first is still talking, which
 * is the behaviour you want and is awkward to guarantee from component state.
 *
 * Client-only. Nothing here may be imported by a server component.
 */

/** Matches the cap in the speech route, so the server never has to truncate. */
const MAX_TEXT_LENGTH = 700;

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement {
  if (!activeAudio) activeAudio = new Audio();
  return activeAudio;
}

function release() {
  const audio = getAudio();
  audio.pause();
  audio.onplay = null;
  audio.onended = null;
  audio.onerror = null;
  audio.removeAttribute("src");
  audio.load();
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

/**
 * Prime the audio element on the first real gesture.
 *
 * Browsers grant permission to play audio to the click that asked for it, and
 * that grant expires while the reply is still being synthesised. Playing a
 * silent frame early keeps one element permanently allowed, so speech that
 * arrives a second later is not blocked.
 */
export function unlockTts() {
  if (unlocked || typeof window === "undefined") return;
  const audio = getAudio();
  audio.muted = true;
  audio.src =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAA";
  const attempt = audio.play();
  if (attempt && typeof attempt.then === "function") {
    attempt
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        unlocked = true;
      })
      .catch(() => {
        audio.muted = false;
      });
  }
}

type TtsHandlers = { onstart?: () => void; onend?: () => void; onerror?: () => void };

/**
 * Once the natural voice has failed, the rest of the session stays on the
 * browser one.
 *
 * The two sound nothing alike. A Lisa who is ElevenLabs on one line and the
 * operating system on the next reads as a fault — worse than being
 * consistently the plainer of the two. A reload gives the good voice another
 * go, which is the right granularity: an exhausted quota or an unset voice ID
 * is not going to fix itself mid-conversation.
 */
let naturalSpeechDown = false;

export async function playTts(text: string, handlers?: TtsHandlers): Promise<void> {
  const spoken = text.trim();
  if (!spoken) throw new Error("No speech text");
  release();

  if (naturalSpeechDown) throw new Error("Natural speech unavailable");

  let response: Response;
  try {
    response = await fetch("/api/voice/tts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: spoken.slice(0, MAX_TEXT_LENGTH) }),
    });
  } catch (error) {
    naturalSpeechDown = true;
    throw error;
  }

  // Covers the 503 a shop with no voice configured returns, which is the
  // common case rather than an error — it just means fall through to the
  // browser and stop asking.
  if (!response.ok) {
    naturalSpeechDown = true;
    throw new Error("Natural speech unavailable");
  }

  const audio = getAudio();
  activeUrl = URL.createObjectURL(await response.blob());
  audio.src = activeUrl;
  audio.muted = false;
  audio.onplay = () => handlers?.onstart?.();
  audio.onended = () => {
    handlers?.onend?.();
    release();
  };
  audio.onerror = () => {
    handlers?.onerror?.();
    release();
  };
  try {
    await audio.play();
  } catch (error) {
    naturalSpeechDown = true;
    throw error;
  }
}

export function stopTts() {
  release();
}

// ---- The browser's own voice ----------------------------------------------

const FEMALE_RE =
  /(female|zira|susan|hazel|linda|samantha|karen|moira|tessa|fiona|serena|catherine|aria|jenny|sonia|libby|amy|joanna|salli|kimberly|google uk english female)/i;

/**
 * The browser's voice list arrives asynchronously: the first `getVoices()` is
 * usually empty, and speaking against an empty list quietly uses whatever the
 * OS default is — which is why an unguarded first line comes out in a
 * different voice from every line after it.
 */
function voicesReady(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish);
    // Not every browser fires the event. A greeting held hostage to it would
    // be worse than one spoken in the default voice.
    setTimeout(finish, 1200);
  });
}

/**
 * Chosen once and kept. The list can be reordered between calls, and picking
 * again each time is the same bug in a subtler form.
 */
let chosenVoice: SpeechSynthesisVoice | null | undefined;

/** English, female where one exists — Lisa is a she, in either engine. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const english = voices.filter((voice) => /^en/i.test(voice.lang));
  const female = english.filter((voice) => FEMALE_RE.test(voice.name));
  return female[0] ?? english[0] ?? voices[0] ?? null;
}

export async function speakWithBrowser(text: string, handlers?: TtsHandlers) {
  const synth = typeof window === "undefined" ? null : window.speechSynthesis;
  if (!synth) return;

  const utterance = new SpeechSynthesisUtterance(text);
  if (chosenVoice === undefined) chosenVoice = pickVoice(await voicesReady(synth));
  if (chosenVoice) {
    utterance.voice = chosenVoice;
    if (chosenVoice.lang) utterance.lang = chosenVoice.lang;
  }
  utterance.onstart = () => handlers?.onstart?.();
  utterance.onend = () => handlers?.onend?.();
  utterance.onerror = () => handlers?.onerror?.();
  synth.speak(utterance);
}

export function stopBrowserSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
