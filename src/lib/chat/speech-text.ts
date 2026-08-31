/**
 * Turning what Lisa wrote into what Lisa should say.
 *
 * Shared deliberately: the shop has two speech engines — ElevenLabs and the
 * browser's own — and they must pronounce the shop's name and its prices the
 * same way. Keeping this beside either one of them would leave the other
 * reading cedis as a letter salad, and the browser voice is the one every
 * visitor hears until an ElevenLabs voice is configured.
 *
 * No `server-only`: the route and the widget both import it.
 */

/**
 * The shop is spelt Abys Hub and said "Habis Hub" — HAB-iss, with an audible
 * leading H and the stress on the first syllable.
 *
 * Left alone, every engine reads "Abys" as "abyss", which is an unfortunate
 * thing for a shop to be called out loud. Respelling it phonetically is the
 * portable fix: SSML phoneme tags would be more precise, but the two engines
 * here do not support them the same way, and the name has to sound identical
 * whichever one is speaking. Only the spoken copy changes — the name stays
 * correctly spelt everywhere it is read.
 */
function sayBrandName(text: string): string {
  return text
    .replace(/\bAbys\b/g, "Habis")
    .replace(/\bABYS\b/g, "HABIS")
    .replace(/\babys\b/g, "habis");
}

/**
 * Prices, spoken.
 *
 * `formatPrice` renders "GH₵ 1,000" with a non-breaking space, which a speech
 * engine either spells out or drops. Spoken it has to become "1,000 Ghana
 * cedis". `\s` covers the non-breaking space, which is what actually sits in
 * that string.
 */
function sayPrices(text: string): string {
  const amount = String.raw`([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)`;
  return (
    text
      // Symbol first, then symbol last, then whatever is left standing alone
      // ("prices are in GHS").
      .replace(new RegExp(String.raw`(?:GH₵|GHS|₵)\s*${amount}`, "gi"), "$1 Ghana cedis")
      .replace(new RegExp(`${amount}\\s*(?:GH₵|GHS|₵)`, "gi"), "$1 Ghana cedis")
      .replace(/\b(?:GH₵|GHS|₵)\b/gi, "Ghana cedis")
  );
}

/**
 * Emoji, removed. Many engines announce them by name — "waving hand",
 * "rocket" — in the middle of a sentence. The message on screen keeps them.
 */
function dropEmoji(text: string): string {
  return text.replace(
    /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu,
    ""
  );
}

/** The whole pipeline, in the order the rules depend on each other. */
export function forSpeech(text: string): string {
  return dropEmoji(sayPrices(sayBrandName(text)))
    .replace(/\s{2,}/g, " ")
    .trim();
}
