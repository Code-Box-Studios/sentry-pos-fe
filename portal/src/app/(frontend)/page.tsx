import Image from "next/image";
import { getLandingContent } from "@/lib/landing";
import { FeatureIcon } from "@/components/landing/FeatureIcon";
import { Reveal } from "@/components/landing/Reveal";
import { Ticker } from "@/components/landing/Ticker";
import { TopNav } from "@/components/landing/TopNav";
import { BranchMockup, type BranchMockupKind } from "@/components/landing/mockups/BranchMockup";
import { CounterMockup } from "@/components/landing/mockups/CounterMockup";
import { DeviceTrio } from "@/components/landing/mockups/DeviceTrio";
import { PortalDashboard } from "@/components/landing/mockups/PortalDashboard";
import { TaxSummary } from "@/components/landing/mockups/TaxSummary";

const SIGNIN_URL = process.env.NEXT_PUBLIC_APP_SIGNIN_URL ?? "https://app.sentry.example/login";

const PILL =
  "rounded-full bg-brand-green px-[26px] py-3 text-sm font-semibold text-ink whitespace-nowrap no-underline transition hover:bg-brand-green-hover hover:text-ink hover:-translate-y-0.5";

function Check() {
  return (
    <span aria-hidden className="text-brand-green-mid font-bold">
      ✓
    </span>
  );
}

/** The ✓ lists under the counter and numbers headings. */
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((text) => (
        <li key={text} className="flex gap-3 text-base leading-[1.55] text-slate">
          <Check />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function LandingPage() {
  const content = await getLandingContent();
  const { hero, banner, contact, footer } = content;

  const requestAccess = `mailto:${contact.email}?subject=${encodeURIComponent("Request access to Sentry")}`;

  // Payload types repeatable and grouped fields as optional; the page renders regardless of what an
  // editor has emptied out.
  const navLinks = (content.nav ?? []).map((l) => ({ label: l.label, href: l.href }));
  const ticker = (hero.ticker ?? []).map((t) => t.text);
  const features = content.features ?? [];
  const counterBullets = (content.counter.bullets ?? []).map((b) => b.text);
  const numbersBullets = (content.numbers.bullets ?? []).map((b) => b.text);
  const branchCards = content.branches.cards ?? [];
  const captions = (content.product.captions ?? []).map((c) => c.text);
  const extras = content.extras.cards ?? [];

  const tones = ["mint", "purple", "orange"];

  return (
    <>
      <TopNav links={navLinks} signInLabel={hero.primaryCta} signInHref={SIGNIN_URL} />

      <main id="top">
        {/* 1 — Hero band */}
        <section className="bg-brand-teal-deep relative overflow-hidden px-6 pt-[120px] pb-18 md:px-8">
          <span
            aria-hidden
            className="anim-drift pointer-events-none absolute -top-[180px] left-[8%] size-[520px] rounded-full bg-[radial-gradient(circle,rgba(0,163,92,0.28)_0%,rgba(0,163,92,0)_70%)] blur-[20px]"
          />
          <span
            aria-hidden
            className="anim-drift2 pointer-events-none absolute -bottom-[220px] right-[4%] size-[640px] rounded-full bg-[radial-gradient(circle,rgba(12,80,110,0.5)_0%,rgba(12,80,110,0)_70%)] blur-[24px]"
          />

          <div className="relative mx-auto flex max-w-[1280px] flex-col items-center gap-7">
            <div className="anim-fade-up flex items-center gap-2 rounded-full border border-white/20 bg-white/6 px-4 py-[7px]">
              <span aria-hidden className="bg-brand-green anim-pulse-dot size-[7px] rounded-full" />
              <span className="text-[13px] font-medium text-white/85">{hero.badge}</span>
            </div>

            <h1
              className="anim-fade-up m-0 text-center text-[40px] leading-[1.1] font-medium tracking-[-1px] text-white text-pretty md:text-[56px] lg:text-[72px] lg:tracking-[-1.5px]"
              style={{ animationDelay: "50ms" }}
            >
              {hero.headline}
            </h1>

            <p
              className="anim-fade-up text-on-dark-muted m-0 max-w-[640px] text-center text-lg leading-[1.5] text-pretty"
              style={{ animationDelay: "220ms" }}
            >
              {hero.sub}
            </p>

            <div className="anim-fade-up flex flex-wrap justify-center gap-3" style={{ animationDelay: "380ms" }}>
              <a href={SIGNIN_URL} className={PILL}>
                {hero.primaryCta}
              </a>
              <a
                href={requestAccess}
                className="rounded-full border border-white/32 px-[26px] py-3 text-sm font-semibold whitespace-nowrap text-white no-underline transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              >
                {hero.secondaryCta}
              </a>
            </div>

            <PortalDashboard />

            <div className="anim-fade-up mt-8 flex w-full justify-center lg:mt-4" style={{ animationDelay: "800ms" }}>
              <Ticker lines={ticker} />
            </div>
          </div>
        </section>

        {/* 2 — Feature trio */}
        <section className="px-6 py-24 md:px-8">
          <div className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal
                as="article"
                key={feature.id ?? feature.title}
                delay={i * 130}
                className="border-hairline bg-canvas flex flex-col gap-3 rounded-xl border p-8 transition-[transform,box-shadow] duration-250 hover:-translate-y-1.5 hover:shadow-[0_12px_24px_0_rgba(0,30,43,0.08)]"
              >
                <FeatureIcon name={feature.icon} tone={feature.tone ?? tones[i]} delay={i * 700} />
                <h2 className="text-[22px] font-medium">{feature.title}</h2>
                <p className="m-0 text-[15px] leading-[1.55] text-slate text-pretty">{feature.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 3 — At the counter */}
        <section id="counter" className="scroll-mt-[84px] px-6 pb-24 md:px-8">
          <div className="mx-auto grid max-w-[1280px] items-center gap-10 md:grid-cols-2 lg:gap-16">
            <Reveal className="flex flex-col gap-5">
              <div className="text-brand-green-dark text-[11px] font-semibold tracking-[1px]">
                {content.counter.eyebrow}
              </div>
              <h2 className="text-[28px] leading-[1.25] font-medium tracking-[-0.5px] text-pretty md:text-[36px]">
                {content.counter.heading}
              </h2>
              <BulletList items={counterBullets} />
            </Reveal>
            <Reveal delay={150}>
              <CounterMockup />
            </Reveal>
          </div>
        </section>

        {/* 4 — The numbers */}
        <section id="numbers" className="scroll-mt-[84px] px-6 pb-24 md:px-8">
          <div className="mx-auto grid max-w-[1280px] items-center gap-10 md:grid-cols-2 lg:gap-16">
            <Reveal>
              <TaxSummary />
            </Reveal>
            <Reveal delay={150} className="flex flex-col gap-5">
              <div className="text-brand-green-dark text-[11px] font-semibold tracking-[1px]">
                {content.numbers.eyebrow}
              </div>
              <h2 className="text-[28px] leading-[1.25] font-medium tracking-[-0.5px] text-pretty md:text-[36px]">
                {content.numbers.heading}
              </h2>
              <BulletList items={numbersBullets} />
            </Reveal>
          </div>
        </section>

        {/* 5 — Every branch */}
        <section id="branches" className="scroll-mt-[84px] px-6 pb-24 md:px-8">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-10">
            <Reveal
              as="h2"
              className="text-center text-[28px] leading-[1.25] font-medium tracking-[-0.5px] text-pretty md:text-[36px]"
            >
              {content.branches.heading}
            </Reveal>
            <div className="grid gap-6 md:grid-cols-2">
              {branchCards.map((card, i) => (
                <Reveal
                  as="article"
                  key={card.id ?? card.mockup}
                  delay={i * 60}
                  className="border-hairline bg-canvas flex flex-col gap-4.5 rounded-2xl border p-7 transition-[transform,box-shadow] duration-250 hover:-translate-y-1.5 hover:shadow-[0_12px_24px_0_rgba(0,30,43,0.08)]"
                >
                  <BranchMockup kind={card.mockup as BranchMockupKind} />
                  <div className="flex gap-3 text-base leading-[1.55] text-slate">
                    <Check />
                    <span>{card.text}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 6 — The product */}
        <section className="px-6 pb-24 md:px-8">
          <div
            id="product"
            className="bg-brand-teal-deep relative mx-auto mb-24 flex max-w-[1280px] scroll-mt-[84px] flex-col gap-12 overflow-hidden rounded-xl px-6 py-18 md:px-12"
          >
            <span
              aria-hidden
              className="anim-drift pointer-events-none absolute -top-[160px] left-[30%] size-[560px] rounded-full bg-[radial-gradient(circle,rgba(0,163,92,0.24)_0%,rgba(0,163,92,0)_70%)]"
            />
            <Reveal className="relative flex flex-col items-center gap-3">
              <div className="text-brand-green text-[11px] font-semibold tracking-[1px]">
                {content.product.eyebrow}
              </div>
              <h2 className="text-center text-[28px] font-medium tracking-[-0.5px] text-white text-pretty md:text-[36px]">
                {content.product.heading}
              </h2>
              <p className="text-on-dark-quiet m-0 max-w-[560px] text-center text-base text-pretty">
                {content.product.sub}
              </p>
            </Reveal>

            <div className="relative">
              <DeviceTrio />
            </div>

            <div className="relative flex flex-wrap justify-center gap-6 lg:gap-12">
              {captions.map((caption, i) => (
                <div
                  key={caption}
                  className={`text-on-dark-quiet text-center text-[13px] ${i !== 1 ? "hidden lg:block" : ""}`}
                >
                  {caption}
                </div>
              ))}
            </div>
          </div>

          {/* 7 — Also in the box */}
          <div className="mx-auto mb-24 flex max-w-[1280px] flex-col gap-8">
            <Reveal as="h2" className="text-center text-[28px] leading-[1.3] font-medium">
              {content.extras.heading}
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((card, i) => (
                <Reveal
                  as="article"
                  key={card.id ?? card.title}
                  delay={(i % 3) * 80}
                  className="border-hairline bg-canvas hover:border-brand-green flex flex-col gap-2 rounded-xl border p-6 transition-[transform,border-color,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_10px_20px_0_rgba(0,30,43,0.06)]"
                >
                  <h3 className="text-base font-semibold">{card.title}</h3>
                  <p className="m-0 text-sm leading-[1.55] text-slate">{card.body}</p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* 8 — Call to action */}
          <Reveal className="bg-brand-teal-deep relative mx-auto flex max-w-[1280px] flex-col items-center gap-6 overflow-hidden rounded-xl px-6 py-16 md:px-16">
            <span
              aria-hidden
              className="anim-drift pointer-events-none absolute -top-[140px] -right-20 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,163,92,0.3)_0%,rgba(0,163,92,0)_70%)]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-[30%] bg-[linear-gradient(105deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0)_100%)]"
              style={{ animation: "shimmer 7s ease-in-out infinite" }}
            />
            <p className="relative m-0 text-center text-[28px] font-medium tracking-[-0.5px] text-white md:text-[36px]">
              {banner.line}
            </p>
            <a href={requestAccess} className={`${PILL} anim-glow-pulse relative`}>
              {banner.cta}
            </a>
            <div className="relative mt-2 flex flex-wrap items-center justify-center gap-7 border-t border-white/12 pt-4">
              <ContactLink href={`mailto:${contact.email}`} glyph="✉" label={contact.email} />
              <ContactLink href={contact.websiteUrl} glyph="🌐" label={contact.websiteLabel} external />
              <ContactLink href={contact.facebookUrl} glyph="f" label={contact.facebookLabel} external />
            </div>
          </Reveal>
        </section>
      </main>

      {/* 9 — Footer */}
      <footer id="contact" className="bg-brand-teal-deep scroll-mt-[84px] px-6 py-16 md:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-6">
          <Image src="/brand/sentry-mark-reverse.svg" alt="Sentry" width={28} height={28} />
          <a href={`mailto:${contact.email}`} className="text-on-dark-quiet text-sm hover:text-white">
            {contact.email}
          </a>
          <a
            href={contact.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-on-dark-quiet text-sm hover:text-white"
          >
            Website
          </a>
          <a
            href={contact.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="text-on-dark-quiet text-sm hover:text-white"
          >
            Facebook
          </a>
          {footer.links?.map((link) => (
            <a
              key={link.id ?? link.href}
              href={link.href}
              className="text-on-dark-quiet text-sm hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="flex-1" />
          <p className="text-on-dark-faint m-0 text-sm">{footer.copyright}</p>
        </div>
      </footer>
    </>
  );
}

function ContactLink({
  href,
  glyph,
  label,
  external,
}: {
  href: string;
  glyph: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-on-dark-muted flex items-center gap-2 text-sm no-underline hover:text-white"
    >
      <span
        aria-hidden
        className="inline-flex size-[26px] items-center justify-center rounded-full border border-white/24 text-xs font-bold"
      >
        {glyph}
      </span>
      {label}
    </a>
  );
}
