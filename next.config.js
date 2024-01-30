/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "**",
      },
    ],
    domains: ["upload.wikimedia.org"],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
