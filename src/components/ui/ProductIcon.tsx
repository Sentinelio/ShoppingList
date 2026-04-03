import { matchProductEmoji } from "../../lib/emojiMatcher";
import { CATEGORIES } from "../../data/categories";

interface ProductIconProps {
  name: string;
  category: string;
}

export default function ProductIcon({ name, category }: ProductIconProps) {
  const match = matchProductEmoji(name);
  const catData = CATEGORIES[category] ?? CATEGORIES.other;

  const emoji = match?.emoji ?? catData.emoji;
  const color = match?.color ?? catData.color;

  return (
    <div
      className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0 select-none"
      style={{ backgroundColor: `${color}18` }}
    >
      {emoji}
    </div>
  );
}
