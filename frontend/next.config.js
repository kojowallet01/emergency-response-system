/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' for server-side features
  // distDir: 'out', // Use default .next directory
  // trailingSlash: true, // Removed to avoid redirect issues
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig;
