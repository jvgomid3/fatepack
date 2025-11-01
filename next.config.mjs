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
  async headers() {
    return [
      {
        // Apply security headers to all API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            // In production, replace with your actual domain(s)
            // For development, allowing localhost
            value: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Authorization, Content-Type, X-Requested-With',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
