import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://scripturestream.app';

export const metadata: Metadata = {
  title: 'About — Scripture Stream',
  description: 'Scripture Stream is a Bible study platform built to help Christians connect deeply with God\'s Word through AI-powered insights, thoughtful tools, and a warm community.',
  alternates: { canonical: `${APP_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#2c2420] font-serif">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center space-y-6">
        <Link href="/" className="inline-flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="Scripture Stream" width={48} height={48} className="w-12 h-12 object-contain" />
          <span className="text-xl font-bold tracking-tight">Scripture Stream</span>
        </Link>
        <div className="inline-block px-4 py-1.5 border border-[#d4af37] text-[#b48a04] text-[10px] font-bold tracking-[0.2em] uppercase rounded-full bg-white/50">
          Our Mission
        </div>
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1]">
          Bringing God&apos;s Word <span className="italic">to life</span>.
        </h1>
        <p className="text-base md:text-lg text-[#6d5b4b] leading-relaxed font-sans max-w-xl mx-auto">
          Scripture Stream exists to help every Christian — from new believers to seasoned scholars — encounter the Bible with fresh depth, clarity, and joy.
        </p>
      </section>

      {/* Mission Statement */}
      <section className="bg-[#2c2420] text-white py-20 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <p className="text-2xl md:text-4xl leading-relaxed italic">
            &ldquo;All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.&rdquo;
          </p>
          <div className="font-sans tracking-[0.3em] text-[10px] md:text-xs opacity-50 uppercase">
            2 Timothy 3:16
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#b48a04]">What We Believe</h2>
          <h3 className="text-3xl md:text-4xl font-medium">Built on these foundations</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-10">
          {[
            {
              title: 'Scripture is Central',
              body: 'We believe the Bible is the inspired Word of God. Every tool we build exists to draw you closer to it — never to replace it.',
            },
            {
              title: 'Accessible to All',
              body: 'Whether you\'re Baptist, Catholic, Orthodox, or non-denominational, Scripture Stream welcomes you. The Word belongs to the whole Body of Christ.',
            },
            {
              title: 'Technology Serves Worship',
              body: 'AI and technology are tools — powerful ones — that we use with care to enhance understanding, not to distract from prayer and devotion.',
            },
            {
              title: 'Warm & Encouraging',
              body: 'We believe Bible study should be joy-filled. Our tone is always warm, patient, and uplifting — meeting you wherever you are on your journey.',
            },
          ].map(({ title, body }) => (
            <div key={title} className="space-y-3">
              <h4 className="text-xl font-medium">{title}</h4>
              <p className="text-[#6d5b4b] font-sans text-sm md:text-base leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#fdf6e8] border-t border-[#e0d6c3] py-20 px-6">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-medium">Begin your journey today.</h2>
          <p className="text-[#6d5b4b] font-sans">
            Free Bible reading in 17 translations. No account required to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/read/john/3"
              className="px-8 py-3.5 bg-[#2c2420] text-white rounded-full text-base font-medium hover:bg-black transition-all font-sans"
            >
              Open the Bible
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 bg-white border border-[#e0d6c3] text-[#2c2420] rounded-full text-base font-medium hover:bg-gray-50 transition-all font-sans"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#fdfaf6] border-t border-[#e0d6c3] text-center">
        <div className="text-[10px] text-[#6d5b4b] font-sans opacity-40 uppercase tracking-widest">
          © 2026 Scripture Stream. Built for wisdom and peace.
        </div>
      </footer>
    </div>
  );
}
