import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'shiprocket.in' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: 'http://localhost:5001/admin',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:5001/admin/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
