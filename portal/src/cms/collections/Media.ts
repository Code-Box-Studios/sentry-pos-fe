import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionConfig } from "payload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Landing images are public content. While the storage host is undecided these live on local disk;
 * pointing Payload's S3 adapter at a public bucket later is a config swap, not a schema change
 * (landing-spec §5). The private tenant bucket is a separate concern the API owns.
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: { group: "Content" },
  upload: {
    staticDir: path.resolve(dirname, "../../../public/media"),
    mimeTypes: ["image/*"],
    imageSizes: [
      { name: "wide", width: 1600, height: undefined, position: "centre" },
      { name: "card", width: 800, height: undefined, position: "centre" },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: { description: "Describe the image for screen readers and search engines." },
    },
  ],
};
