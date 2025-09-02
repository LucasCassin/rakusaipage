/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Adicionado para permitir imagens do Contentful
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Aplica este cabeçalho a todas as rotas do seu site
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            // Diz ao navegador para desativar o acesso ao giroscópio e acelerômetro
            value: "gyroscope=(), accelerometer=()",
          },
        ],
      },
    ];
  },

  // Adiciona a função de redirecionamentos
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: false,
      },
      {
        source: "/logout",
        destination: "/",
        permanent: false,
      },
      {
        source: "/profile/:path*",
        destination: "/",
        permanent: false,
      },
      {
        source: "/register",
        destination: "/",
        permanent: false,
      },
      {
        source: "/status",
        destination: "/",
        permanent: false,
      },
      {
        source: "/tables",
        destination: "/",
        permanent: false,
      },
      {
        source: "/migrations",
        destination: "/",
        permanent: false,
      },
    ];
  },

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
