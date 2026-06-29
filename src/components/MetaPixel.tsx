"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

interface MetaPixelProps {
  pixelId: string;
}

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pixelId) return;

    // Initialize Meta Pixel
    /* eslint-disable no-unused-expressions */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }, [pixelId]);

  // Track PageView on route change
  useEffect(() => {
    if (!pixelId || !window.fbq) return;
    window.fbq("track", "PageView");
  }, [pathname, searchParams, pixelId]);

  if (!pixelId) return null;

  return (
    <>
      {/* Fallback image pixel for users with JS disabled */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hidden"
          height="1"
          width="1"
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt="pixel-fallback"
        />
      </noscript>
    </>
  );
}
