'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

const PLACEHOLDER = '/placeholder-book.svg';

type CoverImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src?: string | null;
};

/**
 * next/image wrapper for book/series covers that falls back to the placeholder
 * when the URL is missing or fails to load (dead CDN links, blocked hosts, etc.)
 * instead of rendering broken-image alt text.
 */
export function CoverImage({ src, alt, className, ...props }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? PLACEHOLDER : src;

  return (
    <Image
      key={resolved}
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
