/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
  devIndicators: {
    allowedDevOrigins: [
        'https://9000-firebase-studio-1748807358440.cluster-iesosxm5fzdewqvhlwn5qivgry.cloudworkstations.dev',
        'https://6000-firebase-studio-1748807358440.cluster-iesosxm5fzdewqvhlwn5qivgry.cloudworkstations.dev',
    ],
  },
};

module.exports = nextConfig;
