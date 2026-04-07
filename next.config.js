/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Workaround for Next.js 15.3 bug: generateBuildId must be explicitly set
  // or the build throws "TypeError: generate is not a function"
  generateBuildId: async () => null,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

module.exports = nextConfig;
