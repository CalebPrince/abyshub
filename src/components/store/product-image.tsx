"use client";

import Image, { type ImageProps } from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Below this, a source photo is a demonstrator portal's thumbnail rather
 * than product photography — TuppAfrica's images run as small as 82×200.
 * Cropping one to fill a large `object-cover` box the way a real product
 * shot does just blows its pixels up and cuts most of it away.
 */
const LOW_RES_THRESHOLD = 300;

/**
 * A drop-in for next/image's `fill` mode that waits to see how big the
 * source actually is. A normal product photo renders exactly as it always
 * has; a thumbnail below the threshold switches to a contained, padded
 * treatment instead of an upscaled crop, trading some empty space for a
 * picture that still looks like a picture.
 */
export function ProductImage({ className, ...props }: ImageProps) {
  const [lowRes, setLowRes] = React.useState(false);

  return (
    <Image
      {...props}
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalWidth < LOW_RES_THRESHOLD || img.naturalHeight < LOW_RES_THRESHOLD) {
          setLowRes(true);
        }
        props.onLoad?.(event);
      }}
      className={cn(className, lowRes && "bg-secondary/40 object-contain p-6")}
    />
  );
}
