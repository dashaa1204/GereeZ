import type { CSSProperties } from "react";

/**
 * The GereeZ logo emblem rendered as a flat, theme-colored mark. The source SVG
 * is an alpha silhouette (emblem opaque, background transparent), used here as a
 * CSS mask so the fill follows `currentColor` — set the color with a text-*
 * class. This keeps the logo transparent-backed and on-brand in both light and
 * dark mode, instead of the baked-in black box of the raw image.
 */
export function BrandMark({ className }: { className?: string }) {
  const mask: CSSProperties = {
    backgroundColor: "currentColor",
    WebkitMaskImage: "url(/logo.svg)",
    maskImage: "url(/logo.svg)",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
  return (
    <span role="img" aria-label="GereeZ" className={className} style={mask} />
  );
}
