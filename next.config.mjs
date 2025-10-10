/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15+: use serverExternalPackages instead of experimental.serverComponentsExternalPackages
  serverExternalPackages: ["pg", "pg-connection-string", "web-push"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Avoid bundling Node built-ins on the client
      config.resolve.fallback = { fs: false, net: false, tls: false, dns: false }
    }
    return config
  },
  async rewrites() {
    // iOS often requests specific apple-touch-icon filenames at the root.
    // Map them to our existing login PNG to ensure the correct home screen icon shows up.
    return [
      { source: '/apple-touch-icon.png', destination: '/placeholder-logo.png' },
      { source: '/apple-touch-icon-precomposed.png', destination: '/placeholder-logo.png' },
      { source: '/apple-touch-icon-180x180.png', destination: '/placeholder-logo.png' },
      { source: '/apple-touch-icon-152x152.png', destination: '/placeholder-logo.png' },
      { source: '/apple-touch-icon-167x167.png', destination: '/placeholder-logo.png' },
      { source: '/apple-touch-icon-120x120.png', destination: '/placeholder-logo.png' },
    ]
  },
}

export default nextConfig
