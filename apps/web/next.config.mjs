/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quickstart/contracts"],
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/coming-soon",
        permanent: false,
      },
      {
        source: "/sign-up",
        destination: "/coming-soon",
        permanent: false,
      },
      {
        source: "/signin",
        destination: "/coming-soon",
        permanent: false,
      },
      {
        source: "/sign-in",
        destination: "/coming-soon",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
