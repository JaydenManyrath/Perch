/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      // Ticketmaster event images (Discovery API serves from ticketm.net CDNs).
      { protocol: "https", hostname: "s1.ticketm.net" },
      { protocol: "https", hostname: "**.ticketm.net" },
    ],
  },
  // unpdf (serverless pdf.js) is server-only — keep it external to the server bundle so
  // its pdf.js worker resolves from node_modules at runtime (Person B; replaced pdf-parse,
  // whose debug harness crashed in the Vercel bundle and made every offer upload parse empty).
  experimental: {
    serverComponentsExternalPackages: ["unpdf"],
  },
};

export default nextConfig;
