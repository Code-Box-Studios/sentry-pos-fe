import type { CollectionConfig } from "payload";

/**
 * Deliberately separate from the platform-admin identity (landing-spec §5): a compromised CMS login
 * reaches marketing copy and nothing else. Payload's own throttling guards the login.
 */
export const CmsUsers: CollectionConfig = {
  slug: "cms-users",
  labels: { singular: "CMS user", plural: "CMS users" },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: "email",
    group: "Settings",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
  ],
};
