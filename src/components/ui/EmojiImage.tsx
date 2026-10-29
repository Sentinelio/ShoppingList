import { FLUENT_3D } from "../../data/fluentEmojis";

interface EmojiImageProps {
  emoji: string;
  size: number;
  className?: string;
}

// Product emoji drawn as its Fluent Emoji 3D image (bundled in
// public/fluent/, no CDN). Emojis without an image fall back to text.
export default function EmojiImage({ emoji, size, className }: EmojiImageProps) {
  const file = FLUENT_3D[emoji] ?? FLUENT_3D[emoji.replace(/️/g, "")];
  if (!file) {
    return (
      <span className={className} style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }} aria-hidden="true">
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}fluent/${file}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
