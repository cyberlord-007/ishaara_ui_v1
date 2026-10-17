import Image from "next/image";

export interface AvatarProps {
  /** The user's display name or email; the same value always draws the same blob. */
  name: string;
  size?: number;
}

/**
 * A deterministic avatar from blobatar.dev (no API key, hotlink-safe SVG), keyed on
 * `name`. Decorative: the name it's generated from is always shown as text alongside it.
 */
export function Avatar({ name, size = 96 }: AvatarProps) {
  const src = `https://blobatar.dev/avatar/${encodeURIComponent(name)}?size=${size}&background=circle`;

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded-full border-2 border-ink"
    />
  );
}
