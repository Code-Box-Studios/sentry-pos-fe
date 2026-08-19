import type { GlobalConfig } from "payload";
import { revalidateLanding } from "../hooks/revalidateLanding";

/**
 * One page, one record (landing-spec §4–5). The shape here is the contract the landing components
 * render, and it tracks design/landing.dc.html section for section: nav, hero, the feature trio,
 * the three deep-dive bands (counter / numbers / branches), the product showcase, the CTA card and
 * the footer.
 *
 * What is *not* modelled here is deliberate: the product mockups — the dashboard, the POS grid, the
 * VAT table, the device trio — are illustrations of the software, not copy. They live in
 * components/landing/mockups/ so an editor cannot accidentally publish a broken screenshot of a
 * screen that does not look like that.
 *
 * Copy rules (§2): sentence case, verb-first, no hype vocabulary, and the honesty rule — the page
 * describes only shipped features.
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
          label: "Nav & hero",
          fields: [
            {
              name: "nav",
              type: "array",
              label: "Nav links",
              labels: { singular: "Link", plural: "Links" },
              maxRows: 6,
              admin: {
                description:
                  "One page, no menu — these jump to section anchors. Use #counter, #numbers, #branches, #product or #contact.",
              },
              defaultValue: [
                { label: "Features", href: "#counter" },
                { label: "Analytics", href: "#numbers" },
                { label: "Branches", href: "#branches" },
                { label: "Design", href: "#product" },
                { label: "Contact", href: "#contact" },
              ],
              fields: [
                { name: "label", type: "text", required: true },
                { name: "href", type: "text", required: true },
              ],
            },
            {
              name: "hero",
              type: "group",
              label: false,
              fields: [
                {
                  name: "badge",
                  type: "text",
                  required: true,
                  defaultValue: "Now onboarding pilot stores",
                  admin: { description: "The small pill above the headline. Keep it short and true." },
                },
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
                    "Sentry is a point-of-sale and monitoring platform for Philippine stores — ring sales at the counter, then watch sales, profit, and stock across every branch from one dashboard.",
                },
                { name: "primaryCta", type: "text", required: true, defaultValue: "Sign in" },
                {
                  name: "secondaryCta",
                  type: "text",
                  required: true,
                  defaultValue: "Request access",
                },
                {
                  name: "ticker",
                  type: "array",
                  label: "Activity ticker",
                  labels: { singular: "Line", plural: "Lines" },
                  admin: {
                    description:
                      "Scrolls under the hero. Sample events, written the way the activity log writes them.",
                  },
                  defaultValue: [
                    { text: "MKT · T1 rang ₱432.86 — just now" },
                    { text: "low stock: Pan de sal at Marikit" },
                    { text: "transfer: 24 × Coke 1.5L → Bayanihan" },
                    { text: "BYN · T1 shift opened 07:00" },
                    { text: "daily summary emailed — Kape Diaria" },
                    { text: "refund PIN approved — logged" },
                  ],
                  fields: [{ name: "text", type: "text", required: true }],
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
                  tone: "mint",
                  title: "Built for the counter",
                  body: "Grid and barcode sales, variants and add-ons, senior and PWD discounts computed correctly, receipts printed or skipped, and shift closes that count the drawer with you.",
                },
                {
                  icon: "chart",
                  tone: "purple",
                  title: "Profit, not just sales",
                  body: "A daily email tells you what you made, not just what you sold. The dashboard shows today at a glance; analytics show the calendar heatmap, top sellers, slow movers, and where money leaks.",
                },
                {
                  icon: "record",
                  tone: "orange",
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
                {
                  name: "tone",
                  type: "select",
                  required: true,
                  defaultValue: "mint",
                  options: [
                    { label: "Mint", value: "mint" },
                    { label: "Purple", value: "purple" },
                    { label: "Orange", value: "orange" },
                  ],
                },
                { name: "title", type: "text", required: true },
                { name: "body", type: "textarea", required: true },
              ],
            },
          ],
        },

        {
          label: "Counter",
          fields: [
            {
              name: "counter",
              type: "group",
              label: false,
              admin: { description: "The band beside the POS mockup." },
              fields: [
                { name: "eyebrow", type: "text", required: true, defaultValue: "AT THE COUNTER" },
                {
                  name: "heading",
                  type: "text",
                  required: true,
                  defaultValue: "Fast enough for the morning rush.",
                },
                {
                  name: "bullets",
                  type: "array",
                  labels: { singular: "Bullet", plural: "Bullets" },
                  defaultValue: [
                    { text: "Tap the grid or scan a barcode — a repeat scan just bumps the quantity." },
                    {
                      text: "Sizes, add-ons, and sold-by-weight items — rice at 0.750 kg keys in straight from your scale.",
                    },
                    {
                      text: "Senior and PWD discounts computed the legal way — VAT off first, then 20%, ID printed on the receipt.",
                    },
                    { text: "Hold a cart mid-order and resume it when the customer comes back." },
                    {
                      text: "Cash, card, GCash, Maya — cash change computed, reference numbers kept for reconciliation.",
                    },
                    {
                      text: "58 or 80 mm receipts with your branding, printed or skipped per sale; reprints are stamped.",
                    },
                  ],
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
          ],
        },

        {
          label: "Numbers",
          fields: [
            {
              name: "numbers",
              type: "group",
              label: false,
              admin: { description: "The band beside the tax-summary mockup." },
              fields: [
                { name: "eyebrow", type: "text", required: true, defaultValue: "THE NUMBERS" },
                {
                  name: "heading",
                  type: "text",
                  required: true,
                  defaultValue: "Know what you made, not just what you sold.",
                },
                {
                  name: "bullets",
                  type: "array",
                  labels: { singular: "Bullet", plural: "Bullets" },
                  defaultValue: [
                    {
                      text: "A daily email at your day's close: sales, gross profit, per-branch breakdown, voids and over/short.",
                    },
                    {
                      text: "Top sellers, slow movers, and margin by product — spot the restock-or-retire list.",
                    },
                    {
                      text: "The leaks view: discount cost by name, void and refund reasons ranked, shrinkage valued at cost.",
                    },
                    { text: "A tax summary your accountant can file from — one click, one CSV." },
                  ],
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
          ],
        },

        {
          label: "Branches",
          fields: [
            {
              name: "branches",
              type: "group",
              label: false,
              fields: [
                {
                  name: "heading",
                  type: "text",
                  required: true,
                  defaultValue: "Run every branch from wherever you are.",
                },
                {
                  name: "cards",
                  type: "array",
                  minRows: 4,
                  maxRows: 4,
                  labels: { singular: "Card", plural: "Cards" },
                  admin: {
                    description:
                      "Each card pairs one line of copy with a fixed illustration. Pick which illustration sits above the line.",
                  },
                  defaultValue: [
                    {
                      mockup: "transfer",
                      text: "Multiple branches, one account — move stock between them in seconds.",
                    },
                    {
                      mockup: "expiry",
                      text: "Inventory that knows its expiry dates — get warned before stock becomes waste.",
                    },
                    {
                      mockup: "stocktake",
                      text: "Stock-take mode for count day: walk the shelves, key the numbers, done.",
                    },
                    {
                      mockup: "terminals",
                      text: "Lost a tablet? Unpair it from the portal and it goes dark.",
                    },
                  ],
                  fields: [
                    {
                      name: "mockup",
                      type: "select",
                      required: true,
                      defaultValue: "transfer",
                      options: [
                        { label: "Transfer stock", value: "transfer" },
                        { label: "Expiring soon", value: "expiry" },
                        { label: "Stock-take", value: "stocktake" },
                        { label: "Terminals", value: "terminals" },
                      ],
                    },
                    { name: "text", type: "text", required: true },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: "Product",
          fields: [
            {
              name: "product",
              type: "group",
              label: false,
              admin: { description: "The dark showcase card and the grid of smaller claims below it." },
              fields: [
                { name: "eyebrow", type: "text", required: true, defaultValue: "THE PRODUCT" },
                {
                  name: "heading",
                  type: "text",
                  required: true,
                  defaultValue: "Every screen, one design language.",
                },
                {
                  name: "sub",
                  type: "textarea",
                  required: true,
                  defaultValue:
                    "Dense where you work fast, calm where you read numbers — the counter, the portal, and your phone all speak the same Sentry.",
                },
                {
                  name: "captions",
                  type: "array",
                  minRows: 3,
                  maxRows: 3,
                  label: "Device captions",
                  labels: { singular: "Caption", plural: "Captions" },
                  admin: { description: "Left to right, under the three device mockups." },
                  defaultValue: [
                    { text: "Your phone — the glance" },
                    { text: "The counter — tablet-first POS" },
                    { text: "The portal — full analytics" },
                  ],
                  fields: [{ name: "text", type: "text", required: true }],
                },
              ],
            },
            {
              name: "extras",
              type: "group",
              label: "Also in the box",
              fields: [
                { name: "heading", type: "text", required: true, defaultValue: "Also in the box" },
                {
                  name: "cards",
                  type: "array",
                  labels: { singular: "Card", plural: "Cards" },
                  defaultValue: [
                    {
                      title: "Named discounts, not typed ones",
                      body: "You define the discount list; the counter picks from it. Every peso given away is reported by name — tawad included.",
                    },
                    {
                      title: "Alerts that find you",
                      body: "Low stock, batches about to expire, a shift left open past closing — a bell in the portal, before it costs you money.",
                    },
                    {
                      title: "Shifts that count the drawer",
                      body: "Opening float, cash in and out with reasons, expected versus counted, and a printable Z report at close.",
                    },
                    {
                      title: "Refunds behind your PIN",
                      body: "Voids need a reason; refunds need your 6-digit PIN. Every attempt — including failed ones — is on the record.",
                    },
                    {
                      title: "Everything exports",
                      body: "Sales, stock movements, shifts, the activity log — every report leaves as a CSV. Your data stays yours.",
                    },
                    {
                      title: "A demo store for practice",
                      body: "Every account includes a demo business with sample stock — train on it, reset it, and keep real numbers clean.",
                    },
                  ],
                  fields: [
                    { name: "title", type: "text", required: true },
                    { name: "body", type: "textarea", required: true },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: "Call to action & footer",
          fields: [
            {
              name: "banner",
              type: "group",
              label: "Call to action",
              fields: [
                {
                  name: "line",
                  type: "text",
                  required: true,
                  defaultValue: "Run your business in sight.",
                },
                { name: "cta", type: "text", required: true, defaultValue: "Request access" },
              ],
            },
            {
              name: "contact",
              type: "group",
              fields: [
                {
                  name: "email",
                  type: "email",
                  required: true,
                  defaultValue: "codeboxstudios.official@gmail.com",
                  admin: {
                    description: "Backs every Request access button as well as the two contact rows.",
                  },
                },
                {
                  name: "websiteUrl",
                  type: "text",
                  required: true,
                  defaultValue: "https://code-box-studios.vercel.app/",
                },
                {
                  name: "websiteLabel",
                  type: "text",
                  required: true,
                  defaultValue: "code-box-studios.vercel.app",
                },
                {
                  name: "facebookUrl",
                  type: "text",
                  required: true,
                  defaultValue: "https://www.facebook.com/codeboxstudios",
                },
                {
                  name: "facebookLabel",
                  type: "text",
                  required: true,
                  defaultValue: "facebook.com/codeboxstudios",
                },
              ],
            },
            {
              name: "footer",
              type: "group",
              fields: [
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
                {
                  name: "copyright",
                  type: "text",
                  required: true,
                  defaultValue: "© 2026 Code Box Studios",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
