import { matchProductEmoji } from "../../lib/emojiMatcher";
import { getCategoryColor } from "../../data/categories";
import EmojiImage from "../ui/EmojiImage";

interface ItemIconProps {
  /** Text used to pick the product emoji (usually item.original). */
  name: string;
  category: string;
  photo?: string | null;
  size?: number;
}

// Product icon (Fluent Emoji 3D) on a rounded tile tinted with its category
// colour. The item's own photo wins over the emoji.
export default function ItemIcon({ name, category, photo, size = 40 }: ItemIconProps) {
  const color = getCategoryColor(category || "other");
  const radius = Math.round(size * 0.28);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        loading="lazy"
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      className="shrink-0 flex items-center justify-center select-none"
      style={{ width: size, height: size, borderRadius: radius, background: `${color}26` }}
      aria-hidden="true"
    >
      <EmojiImage emoji={matchProductEmoji(name).emoji} size={Math.round(size * 0.68)} />
    </span>
  );
}
