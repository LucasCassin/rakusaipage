/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Desabilita HMR em produção e preview
    if (!dev) {
      config.optimization.minimize = true;
      // Remove o plugin de HMR
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== "HotModuleReplacementPlugin",
      );
    }
    return config;
  },
};

module.exports = nextConfig;
