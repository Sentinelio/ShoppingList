import { PRODUCT_EMOJIS } from '../data/productEmojis';

interface EmojiMatch {
  emoji: string;
  color: string;
}

// Pre-compile regex for fast matching
const COMPILED = PRODUCT_EMOJIS.map(([kw, emoji, color]) => {
  const parts = kw.split("|")
    .sort((a, b) => b.length - a.length)
    .map(k => k.length <= 3 ? `\\b${k}\\b` : k);
  return { rx: new RegExp(parts.join("|"), "i"), emoji, color };
});

const cache: Record<string, EmojiMatch> = {};

export function matchProductEmoji(name: string): EmojiMatch {
  const s = (name || "").toLowerCase();
  if (cache[s]) return cache[s];
  for (const { rx, emoji, color } of COMPILED) {
    if (rx.test(s)) {
      cache[s] = { emoji, color };
      return cache[s];
    }
  }
  cache[s] = { emoji: "🛒", color: "#7e85a0" };
  return cache[s];
}
