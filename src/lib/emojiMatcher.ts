import { PRODUCT_EMOJIS } from '../data/productEmojis';

export function matchProductEmoji(
  name: string
): { emoji: string; color: string } | null {
  const lower = name.toLowerCase();

  for (const [keywordsStr, emoji, color] of PRODUCT_EMOJIS) {
    const keywords = keywordsStr.split('|');
    const pattern = keywords
      .map((kw) => (kw.length <= 3 ? `\\b${kw}\\b` : kw))
      .join('|');
    const regex = new RegExp(pattern, 'i');

    if (regex.test(lower)) {
      return { emoji, color };
    }
  }

  return null;
}
