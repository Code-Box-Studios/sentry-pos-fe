import type { GlobalConfig } from "payload";
import { revalidateLanding } from "../hooks/revalidateLanding";

/**
 * One page, one record (landing-spec §4–5). The shape here is the contract the landing components
 * render; the launch copy in §7 seeds it as field defaults, so a fresh database renders the real
 * page before anyone opens the CMS.
 *
 * Copy rules (§2): sentence case, verb-first, no hype vocabulary, and the honesty rule — the page
 * describes only shipped features. Offline and staff-roles claims join it when those ship.
 */
export const LandingContent: GlobalConfig = {
  slug: "landing-content",
  label: "Landing page",
  admin: { group: "Content" },
  hooks: {
    // Edits go live in seconds while visitors keep getting a static page.
    afterChange: [revalidateLanding],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Meta",
          fields: [
            {
              name: "meta",
              type: "group",
              label: false,
              fields: [
                {
                  name: "title",
                  type: "text",
                  required: true,
                  defaultValue: "Sentry — POS and business monitoring for Philippine businesses",
                },
                {
                  name: "description",
                  type: "textarea",
                  required: true,
                  defaultValue:
                    "A point-of-sale and analytics platform for PH stores and cafés. Ring sales, track stock and expiry, and see your profit — across every branch, every day.",
                  admin: {
                    description:
                      "Leans into the PH-POS framing to separate us from sentry.io in search results.",
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Hero",
          fields: [
            {
              name: "hero",
              type: "group",
              label: false,
              fields: [
                {
                  name: "headline",
                  type: "text",
                  required: true,
                  defaultValue: "Your business, always in sight.",
                },
                {
                  name: "sub",
                  type: "textarea",
                  required: true,
                  defaultValue:
                    "Sentry is a point-of-sale and monitoring platform for Philippine stores and cafés — ring sales at the counter, then watch sales, profit, and stock across every branch from one dashboard.",
                },
                { name: "primaryCta", type: "text", required: true, defaultValue: "Sign in" },
                { name: "secondaryCta", type: "text", required: true, defaultValue: "Request access" },
                {
                  name: "screenshot",
                  type: "upload",
                  relationTo: "media",
                  admin: { description: "Portal dashboard product shot." },
                },
              ],
            },
          ],
        },
        {
          label: "Features",
          fields: [
            {
              name: "features",
              type: "array",
              minRows: 3,
              maxRows: 3,
              labels: { singular: "Feature", plural: "Features" },
              defaultValue: [
                {
                  icon: "counter",
                  title: "Built for the counter",
                  body: "Grid and barcode sales, variants and add-ons, senior and PWD discounts computed correctly, receipts printed or skipped, and shift closes that count the drawer with you.",
                },
                {
                  icon: "chart",
                  title: "Profit, not just sales",
                  body: "A daily email tells you what you made, not just what you sold. The dashboard shows today at a glance; analytics show the calendar heatmap, top sellers, slow movers, and where money leaks.",
                },
                {
                  icon: "record",
                  title: "Everything on the record",
                  body: "Every sale, price change, refund, and adjustment is logged — who, when, and what changed. Immutable, complete, and yours to search.",
                },
              ],
              fields: [
                {
                  name: "icon",
                  type: "select",
                  required: true,
                  defaultValue: "counter",
                  options: [
                    { label: "Counter", value: "counter" },
                    { label: "Chart", value: "chart" },
                    { label: "Record", value: "record" },
                  ],
                },
                { name: "title", type: "text", required: true },
                { name: "body", type: "textarea", required: true },
              ],
            },
          ],
        },
        {
          label: "Detail",
          fields: [
            {
              name: "detail",
              type: "group",
              label: false,
              fields: [
                {
                  name: "screenshot",
                  type: "upload",
                  relationTo: "media",
                  admin: { description: "Second product shot, shown beside the bullets." },
                },
                {
                  name: "bullets",
                  type: "array",
                  minRows: 4,
                  maxRows: 4,
                  labels: { singular: "Bullet", plural: "Bullets" },
                  defaultValue: [
                    { text: "Multiple branches, one account — move stock between them in seconds." },
                    { text: "Inventory that knows its expiry dates — get warned before stock becomes waste." },
                    { text: "Stock-take mode for count day: walk the shelves, key the numbers, done." },
                    { text: "Lost a tablet? Unpair it from the portal and it goes dark." },
                  ],
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
          ],
        },
        {
          label: "Banner & footer",
          fields: [
            {
              name: "banner",
              type: "group",
              fields: [
                { name: "line", type: "text", required: true, defaultValue: "Run your business in sight." },
                { name: "cta", type: "text", required: true, defaultValue: "Request access" },
              ],
            },
            {
              name: "footer",
              type: "group",
              fields: [
                {
                  name: "supportEmail",
                  type: "email",
                  required: true,
                  defaultValue: "support@sentrypos.ph",
                  admin: { description: "Backs the Request access mailto and the footer link." },
                },
                {
                  name: "links",
                  type: "array",
                  labels: { singular: "Link", plural: "Links" },
                  defaultValue: [
                    { label: "Terms of service", href: "/terms" },
                    { label: "Privacy policy", href: "/privacy" },
                  ],
                  fields: [
                    { name: "label", type: "text", required: true },
                    { name: "href", type: "text", required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
