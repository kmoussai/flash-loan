const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flash-loan.ca',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude puppeteer and related packages from webpack bundling
    // These are server-only packages and should be treated as externals
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'puppeteer-core': 'commonjs puppeteer-core',
        '@sparticuz/chromium-min': 'commonjs @sparticuz/chromium-min',
      })
    }
    
    // Ignore these packages in client-side bundles
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    }
    
    return config
  },
}

module.exports = withNextIntl(nextConfig)
