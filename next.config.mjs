/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15+: use serverExternalPackages instead of experimental.serverComponentsExternalPackages
  serverExternalPackages: ["pg", "pg-connection-string"],
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
}

export default nextConfig
