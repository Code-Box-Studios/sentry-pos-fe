import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { buildConfig } from "payload";
import { CmsUsers } from "./cms/collections/CmsUsers";
import { Media } from "./cms/collections/Media";
import { LandingContent } from "./cms/globals/LandingContent";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  // /admin belongs to the Sentry platform panel; the marketing CMS lives at /cms (landing-spec §5).
  routes: { admin: "/cms" },
  admin: {
    user: CmsUsers.slug,
    meta: {
      titleSuffix: "— Sentry CMS",
      // Without this the CMS tab wears the Payload logo. The landing page's own icon comes from
      // the app/(frontend)/icon.svg file convention; Payload's admin is outside that segment.
      icons: [{ rel: "icon", type: "image/svg+xml", url: "/brand/sentry-favicon.svg" }],
    },
  },
  collections: [CmsUsers, Media],
  globals: [LandingContent],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  // Payload resizes uploads with sharp.
  sharp,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI ?? "" },
    // Payload's tables are confined to their own schema; tenant data will live in `public`.
    schemaName: "cms",
  }),
});
