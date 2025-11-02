/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip .env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iiazjw8b8a.ufs.sh',
        port: '',
        pathname: '/f/**',
      },
    ],
  },
};

export default config;
