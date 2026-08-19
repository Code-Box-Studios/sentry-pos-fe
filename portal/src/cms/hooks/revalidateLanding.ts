import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

/** The cache tag the landing page fetch is registered under. */
export const LANDING_TAG = "landing-content";

/**
 * ISR with on-demand revalidation (landing-spec §5): visitors always get a static page, and an edit
 * in the CMS goes live within seconds instead of waiting for a rebuild.
 */
export const revalidateLanding: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidateTag(LANDING_TAG);
  req.payload.logger.info("Landing page revalidated after CMS change");
  return doc;
};
