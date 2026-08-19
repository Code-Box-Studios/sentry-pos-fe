import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The portal is server-rendered — unlike pos/, which is a static export.
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withPayload(nextConfig);
