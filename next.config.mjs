const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  webpack(config, { dev }) {
    // OneDrive-backed workspaces cannot reliably snapshot Webpack's persistent
    // filesystem cache during production builds. The cache is an optimization,
    // not application state, so disable it only for production builds.
    if (!dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
