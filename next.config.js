// next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Keep your @ alias
    config.resolve.alias["@" ] = path.resolve(__dirname);
    return config;
  },
  images: {
    domains: ["srenvolegaawfstscbdw.supabase.co"],
  },
};

module.exports = nextConfig;
