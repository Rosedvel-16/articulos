/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure data/ is available at runtime for local filesystem storage
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
