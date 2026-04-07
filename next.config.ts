import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // Polyfill `process` in the browser bundle so third-party packages
      // that reference process.env.NODE_ENV don't throw "process is not defined".
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
        })
      );
    }
    return config;
  },
};

export default nextConfig;
