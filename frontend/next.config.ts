import type { NextConfig } from "next";
const host = process.env.NEXT_PUBLIC_MEDIA_HOST;
if (host && (!/^[a-zA-Z0-9]+(?:[-.][a-zA-Z0-9]+)*$/.test(host) || !host.includes("."))) throw new Error("NEXT_PUBLIC_MEDIA_HOST must be one exact HTTPS hostname without a port or wildcard");
const nextConfig: NextConfig = {
  output: "standalone",
  htmlLimitedBots: /.*/,
  images: { remotePatterns: host ? [{ protocol: "https", hostname: host, port: "", pathname: "/techyfellow/media/**", search: "" }] : [] },
  async headers() { return [{ source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; },
  async rewrites() {
    const backendUrl = (process.env.CONTENT_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};
export default nextConfig;

