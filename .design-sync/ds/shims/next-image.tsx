/* Browser shim for `next/image`.
 *
 * The real component needs Next's image config and optimizer endpoint. Preview
 * cards render from the repo's own /public assets, so a plain <img> carrying
 * the same layout semantics is the faithful stand-in. `fill` is reproduced with
 * the absolute-inset positioning next/image itself applies. */

import type { CSSProperties, ImgHTMLAttributes } from "react";

type StaticImport = { src: string; height?: number; width?: number };

export interface ImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  src: string | StaticImport;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  /** Accepted and ignored — optimizer-only concerns. */
  priority?: boolean;
  quality?: number;
  loading?: "eager" | "lazy";
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  sizes?: string;
}

export default function Image({
  src,
  alt,
  width,
  height,
  fill,
  style,
  priority: _priority,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  unoptimized: _unoptimized,
  ...rest
}: ImageProps) {
  const url = typeof src === "string" ? src : src?.src;
  const fillStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }
    : {};
  return (
    <img
      src={url}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={{ ...fillStyle, ...style }}
      {...rest}
    />
  );
}
