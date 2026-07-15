/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse is a server-only CommonJS module; keep it external to the server bundle.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
