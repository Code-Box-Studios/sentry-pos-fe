import Image from "next/image";
import Link from "next/link";
import { getLandingContent } from "@/lib/landing";
import type { Media } from "@/payload-types";
import { FeatureIcon } from "@/components/landing/FeatureIcon";
import { MockupCard } from "@/components/landing/MockupCard";

const SIGNIN_URL = process.env.NEXT_PUBLIC_APP_SIGNIN_URL ?? "https://app.sentry.example/login";

function asMedia(value: unknown): Media | null {
  return value && typeof value === "object" && "url" in value ? (value as Media) : null;
}

export default async function LandingPage() {
  const content = await getLandingContent();
  const { hero, banner, footer } = content;
  const requestAccess = `mailto:${footer.supportEmail}?subject=${encodeURIComponent("Request access to Sentry")}`;

  // Payload types repeatable and grouped fields as optional; the page renders regardless of what an
  // editor has emptied out.
  const features = content.features ?? [];
  const bullets = content.detail?.bullets ?? [];
  const heroShot = asMedia(hero.screenshot);
  const detailShot = asMedia(content.detail?.screenshot);

  return (
    <>
      {/* 1 — Nav. A one-page site needs no menu (landing-spec §1). */}
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link href="/" className="flex items-center" aria-label="Sentry home">
            <Image src="/brand/sentry-lockup.svg" alt="Sentry" width={112} height={28} priority />
          </Link>
          <div className="flex-1" />
          <a
            href={SIGNIN_URL}
            className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-green-pressed hover:text-white"
          >
            {hero.primaryCta}
          </a>
        </nav>
      </header>

      <main>
        {/* 2 — Hero band */}
        <section className="bg-brand-teal-deep px-6 py-20 md:py-28">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 text-center">
            <h1 className="text-on-dark text-[40px] leading-[1.1] font-medium tracking-[-1px] md:text-[64px] md:tracking-[-1.5px]">
              {hero.headline}
            </h1>
            <p className="text-on-dark-muted max-w-2xl text-lg leading-[1.5]">{hero.sub}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={SIGNIN_URL}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-brand-green-pressed hover:text-white"
              >
                {hero.primaryCta}
              </a>
              <a
                href={requestAccess}
                className="text-on-dark border-hairline-dark rounded-full border px-[22px] py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                {hero.secondaryCta}
              </a>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            {heroShot?.url ? (
              <Image
                src={heroShot.url}
                alt={heroShot.alt ?? ""}
                width={heroShot.width ?? 1600}
                height={heroShot.height ?? 1000}
                className="rounded-xl border border-white/10 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]"
                priority
              />
            ) : (
              <MockupCard label="Portal dashboard" />
            )}
          </div>
        </section>

        {/* 3 — Feature trio */}
        <section className="bg-canvas px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.id ?? feature.title}
                className="flex flex-col gap-4 rounded-lg border border-hairline bg-canvas p-8"
              >
                <FeatureIcon name={feature.icon} />
                <h2 className="text-[22px] leading-[1.35] font-medium text-ink">{feature.title}</h2>
                <p className="text-base leading-[1.55] text-slate">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 4 — Detail band */}
        <section className="bg-surface px-6 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div>
              {detailShot?.url ? (
                <Image
                  src={detailShot.url}
                  alt={detailShot.alt ?? ""}
                  width={detailShot.width ?? 1200}
                  height={detailShot.height ?? 800}
                  className="rounded-xl border border-hairline"
                />
              ) : (
                <MockupCard label="Branch stock view" tone="light" />
              )}
            </div>
            <ul className="flex flex-col gap-5">
              {bullets.map((bullet) => (
                <li key={bullet.id ?? bullet.text} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-brand-green" />
                  <span className="text-base leading-[1.55] text-charcoal">{bullet.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 — CTA banner */}
        <section className="bg-brand-teal-deep px-6 py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <p className="text-on-dark text-[28px] leading-[1.3] font-medium">{banner.line}</p>
            <a
              href={requestAccess}
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-brand-green-pressed hover:text-white"
            >
              {banner.cta}
            </a>
          </div>
        </section>
      </main>

      {/* 6 — Footer */}
      <footer className="bg-brand-teal-deep border-t border-white/10 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center">
          <Image src="/brand/sentry-mark-reverse.svg" alt="Sentry" width={28} height={28} className="size-7" />
          <div className="flex-1" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={`mailto:${footer.supportEmail}`} className="text-on-dark-muted text-sm hover:text-white">
              {footer.supportEmail}
            </a>
            {footer.links?.map((link) => (
              <a
                key={link.id ?? link.href}
                href={link.href}
                className="text-on-dark-muted text-sm hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-on-dark-quiet text-sm">© 2026 Code Box Studios</p>
        </div>
      </footer>
    </>
  );
}
