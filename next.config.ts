
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: ["https://6000-firebase-studio-1748807358440.cluster-iesosxm5fzdewqvhlwn5qivgry.cloudworkstations.dev"]
  },
  // output: 'standalone', // Removido para Vercel
};

export default nextConfig;
