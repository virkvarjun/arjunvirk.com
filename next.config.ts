import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Short link: arjunvirk.com/rl-guide -> the RL Bible table of contents.
      {
        source: "/rl-guide",
        destination: "/writing/rl-guide",
        permanent: true,
      },
      {
        source: "/rl-guide/:chapter",
        destination: "/writing/rl-guide/:chapter",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
