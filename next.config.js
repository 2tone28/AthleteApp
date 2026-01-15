/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config) => {
    // Suppress the serializing big strings warning
    config.ignoreWarnings = [
      { module: /node_modules/ },
      { message: /Serializing big strings/ },
    ]
    return config
  },
}

module.exports = nextConfig
