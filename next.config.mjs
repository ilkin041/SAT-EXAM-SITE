import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // AVIF first, WebP second (T3.5). The default list is WebP only, and the
    // landing page's screenshots are large flat-UI images — exactly the case
    // AVIF wins by a wide margin. Chrome and Safari take the AVIF, everything
    // else falls back to the WebP, and the source files in `public/screenshots`
    // are WebP already so nothing has to decode a PNG at request time.
    formats: ["image/avif", "image/webp"],
  },
};

// `npm run analyze` sets ANALYZE=true; a normal build is untouched.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default withBundleAnalyzer(nextConfig);
