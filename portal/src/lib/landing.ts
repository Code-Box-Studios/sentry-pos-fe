import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { LANDING_TAG } from "@/cms/hooks/revalidateLanding";
import type { LandingContent } from "@/payload-types";

/**
 * Visitors always get a static page; Payload's afterChange hook busts this tag so an edit goes live
 * in seconds (landing-spec §5).
 */
export const getLandingContent = unstable_cache(
  async (): Promise<LandingContent> => {
    const payload = await getPayload({ config });
    return payload.findGlobal({ slug: "landing-content", depth: 1 });
  },
  ["landing-content"],
  { tags: [LANDING_TAG] }
);
